import { withCache } from "../cache/redis.js";
import { logger } from "../logger.js";
import { isGeminiConfigured, postGemini } from "./gemini.js";
import { romanToDevanagari } from "./transliterate.js";

/**
 * संधि विच्छेद — reading a name by taking it apart.
 *
 * WHY THIS REPLACES THE OLD SPLITTER. compoundParts() asked, in English, of a
 * roman string: "is this a compound? if unsure reply NONE". Three things were
 * wrong with that.
 *
 * It asked in the wrong script. Sandhi is a property of the Devanagari form,
 * not of a Latin transcription of it. "Rivaan" carries no information about
 * which vowel is long; रिवान does.
 *
 * It asked the wrong question. A compound is not simply two substrings pushed
 * together. In sandhi the join CHANGES the sounds: देव + इन्द्र becomes
 * देवेन्द्र, because अ + इ → ए. No amount of slicing the surface form recovers
 * देव and इन्द्र from देवेन्द्र, because the letters इ and अ are no longer
 * there. Undoing that is what विच्छेद means, and it has to be asked for by
 * name.
 *
 * And it was biased toward silence. "If you are unsure, reply NONE" is the
 * right instinct — we do not invent meanings — but applied to the whole
 * question it meant real names came back as nothing. Rivaan returned NONE, and
 * the certificate then told a family their son's name "belongs to no
 * dictionary". The honesty rule belongs on each PART, not on the attempt.
 *
 * So this asks, in Devanagari, in order: is this one word in a dictionary? If
 * not, what is its sandhi-vichched, which rule joined it, and what does each
 * part mean on its own? Every part must be a real word or the whole answer is
 * discarded — that is where "never guess" is enforced, and it is enforced per
 * part rather than by refusing to look.
 */

/** 180 days, matching the other name lookups: a name's etymology does not move. */
const CACHE_TTL = 180 * 24 * 3600;

export interface SandhiPart {
  devanagari: string;
  roman: string;
  /** The part's own dictionary meaning. Never empty — a part without one is rejected. */
  meaning: string;
}

export interface SandhiReading {
  /** The Devanagari form that was analysed, so a reader can check the working. */
  devanagari: string;
  /** True when Hindi or Sanskrit already carries this as one word. */
  single: boolean;
  /** The dictionary sense of the whole word, when there is one. */
  wholeMeaning?: string;
  /** The parts recovered by vichched. Empty when the name is a single word. */
  parts: SandhiPart[];
  /** The rule that joined them, named — e.g. "दीर्घ संधि (अ + अ → आ)". */
  rule?: string;
  /** The reading the parts add up to, in a parent's words rather than a grammarian's. */
  composed?: string;
}

interface RawSandhi {
  single?: boolean;
  wholeMeaning?: string;
  rule?: string;
  composed?: string;
  parts?: Array<{ devanagari?: string; roman?: string; meaning?: string }>;
}

const SCHEMA = {
  type: "object",
  properties: {
    single: { type: "boolean" },
    wholeMeaning: { type: "string" },
    rule: { type: "string" },
    composed: { type: "string" },
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          devanagari: { type: "string" },
          roman: { type: "string" },
          meaning: { type: "string" },
        },
        required: ["devanagari", "roman", "meaning"],
      },
    },
  },
  required: ["single", "parts"],
};

const prompt = (roman: string, deva: string) =>
  `You are reading an Indian given name the way a Hindi teacher would: "${roman}", written ${deva}.

Answer in two steps.

STEP 1 — Is ${deva} a single word that a Hindi or Sanskrit dictionary already carries?
If yes: single=true, wholeMeaning = its meaning in one short clause, parts = [].

STEP 2 — If it is NOT a single dictionary word, perform संधि विच्छेद (sandhi vichched) on it.
Remember that a sandhi join CHANGES sounds, so the parts are often not visible in the surface spelling: देवेन्द्र is देव + इन्द्र because अ + इ → ए, and दिव्योम is दिव्य + ओम्.
Give: single=false, parts = each component in Devanagari with its roman form and its OWN dictionary meaning, rule = the sandhi named in Hindi with the vowel or consonant change in brackets, composed = what the parts together say about the name, as one short clause a parent would understand.

Rules you must not break:
- Every part must be a real word in Sanskrit, Hindi or a related Indian language, with a meaning you are sure of. If any part would be invented, or is only a fragment, return single=false with parts=[] instead of guessing.
- The parts must actually recombine into ${deva} under the rule you name. If they do not, return parts=[].
- Do not pad. Two parts is the normal answer; three only when the name genuinely has three.
- composed must follow from the parts. Do not introduce a meaning the parts do not carry.
- Never describe the name as meaningless, modern or invented. That is not what is being asked, and it is not yours to conclude here.`;

/**
 * Read a name by taking it apart. Returns null when nothing can be said
 * honestly — which the caller must treat as "we do not know", never as "this
 * name has no meaning".
 */
export async function sandhiVichched(name: string): Promise<SandhiReading | null> {
  // Unit tests never touch the network, and a suite that needs Gemini up to
  // pass is a suite that fails on the train.
  if (process.env.VITEST || !isGeminiConfigured()) return null;

  const roman = name.trim();
  if (!/^[A-Za-z][A-Za-z\s'-]{1,40}$/.test(roman)) return null;

  const devanagari = romanToDevanagari(roman);
  if (!devanagari) return null;

  try {
    const reading = await withCache<SandhiReading | { none: true }>(
      `cache:sandhi:${roman.toLowerCase()}`,
      CACHE_TTL,
      async () => {
        const res = await postGemini(
          {
            contents: [{ parts: [{ text: prompt(roman, devanagari) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: SCHEMA,
              temperature: 0,
            },
          },
          "sandhi-vichched",
        );
        // Thrown, not returned. Returning a miss here would cache a rate limit
        // as the permanent answer "this name does not split" for 180 days —
        // the exact trap that made Divyom stop splitting after one bad minute.
        if (!res.ok) throw new Error(`gemini_${res.status}`);

        const j = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return { none: true } as const;

        let raw: RawSandhi;
        try { raw = JSON.parse(text) as RawSandhi } catch { return { none: true } as const }

        const parts = (raw.parts ?? [])
          .map((p) => ({
            devanagari: (p.devanagari ?? "").trim(),
            roman: (p.roman ?? "").trim(),
            meaning: (p.meaning ?? "").trim(),
          }))
          // A part with no meaning of its own is exactly the guess this is
          // meant to prevent, so one bad part discards the whole split.
          .filter((p) => p.devanagari && p.meaning);

        const complete = parts.length === (raw.parts ?? []).length;

        if (raw.single && (raw.wholeMeaning ?? "").trim()) {
          return {
            devanagari,
            single: true,
            wholeMeaning: raw.wholeMeaning!.trim(),
            parts: [],
          };
        }
        if (!raw.single && complete && parts.length >= 2) {
          return {
            devanagari,
            single: false,
            parts,
            rule: (raw.rule ?? "").trim() || undefined,
            composed: (raw.composed ?? "").trim() || undefined,
          };
        }
        return { none: true } as const;
      },
    );
    return "none" in reading ? null : reading;
  } catch (err) {
    logger.warn({ err: (err as Error).message, name }, "sandhi vichched unavailable");
    return null;
  }
}

/**
 * One sentence a certificate or a tile can print, or null.
 *
 * Kept here rather than at each call site so the two surfaces cannot describe
 * the same name differently — the certificate saying a name is made up while
 * the tile beside it shows the split was the bug this whole file exists for.
 */
export function sandhiSentence(r: SandhiReading | null): string | null {
  if (!r) return null;
  if (r.single) return r.wholeMeaning ? `${r.devanagari} — ${r.wholeMeaning}.` : null;
  if (r.parts.length < 2) return null;
  const joined = r.parts.map((p) => `${p.devanagari} (${p.roman}, ${p.meaning})`).join(" + ");
  const rule = r.rule ? ` by ${r.rule}` : "";
  const says = r.composed ? ` Together they read as ${r.composed.replace(/\.$/, "")}.` : "";
  return `${r.devanagari} breaks as ${joined}${rule}.${says}`;
}
