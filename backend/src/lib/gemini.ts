import { withCache } from "../cache/redis.js";
import { logger } from "../logger.js";
import { recordApiCall } from "./api-usage.js";
import { lookupMeaning } from "./meanings.js";

/**
 * Gemini — a SECOND OPINION on what a name means, never the first.
 *
 * The verified dictionary in landmines-data.ts stays authoritative: those
 * 44 patterns were researched, independently challenged, and swept against
 * 8,955 real names. This adds reach — a bad meaning in a language nobody has
 * hand-written a dictionary for.
 *
 * Because it is a language model, three rules are enforced here rather than
 * hoped for:
 *
 * 1. IT MUST BE ABLE TO SAY "NOTHING". The prompt makes "this means nothing
 *    in that language" the expected answer, and the probe that qualified this
 *    model tested invented names ("Zerofluke", "Blorptrix") — both correctly
 *    returned nothing in all seven languages. A model that invents meanings
 *    for nonsense is not fit for a page a family reads before a namkaran.
 *
 * 2. ITS OUTPUT IS LABELLED AS ITS OWN. The tile shows these rows separately
 *    from the verified dictionary, so a customer always knows which claims we
 *    stand behind and which are a machine's reading.
 *
 * 3. IT NEVER HOLDS UP A SCAN. Hard timeout; on any failure the answer is
 *    simply absent and the tile says so. A slow opinion is worth less than a
 *    fast honest "not checked".
 */

const MODEL = "gemini-flash-lite-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 6_000;
const CACHE_TTL = 180 * 24 * 3600; // meanings do not change; cache for six months

export const GEMINI_LANGUAGES = [
  "Hindi", "Tamil", "Bengali", "Marathi", "Telugu", "Gujarati", "Punjabi",
  "Kannada", "Malayalam", "Odia", "Assamese",
] as const;

export interface GeminiReading {
  language: string;
  meaning: string;
  sentiment: "good" | "neutral" | "bad";
}

/**
 * One POST to Gemini, retried on the two statuses that mean "ask again"
 * rather than "this will never work".
 *
 * Without this, a 429 — which a free-tier key earns easily whenever several
 * names are read at once, as the shortlist does — reached the customer as
 * "no meaning we could confirm". That is a different claim, and a false one:
 * we had not failed to find a meaning, we had failed to ask. A rate limit is
 * our problem and it should not be reported as a fact about their name.
 *
 * Only 429 and 503 are retried. A timeout is not: it has already spent the
 * budget, and the scan has a deadline to keep.
 */
export async function postGemini(body: unknown, label: string): Promise<Response> {
  const key = process.env.GEMINI_API_KEY ?? "";
  const ATTEMPTS = 3;
  let last: Response | null = null;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const after = Number(last?.headers.get("retry-after"));
      // Jittered on purpose. Several verifications run at once, so a fixed
      // wait makes every one of them retry in the same instant and collide
      // with each other exactly as they did the first time.
      const base = Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 3_000) : 350 * attempt;
      const waitMs = base + Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    void recordApiCall("gemini", label, res.ok);
    if (res.ok || (res.status !== 429 && res.status !== 503)) return res;
    last = res;
  }
  return last as Response;
}
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const SCHEMA = {
  type: "object",
  properties: {
    readings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          language: { type: "string" },
          known: { type: "boolean" },
          meaning: { type: "string" },
          sentiment: { type: "string", enum: ["good", "neutral", "bad"] },
        },
        required: ["language", "known", "meaning", "sentiment"],
      },
    },
  },
  required: ["readings"],
};

const prompt = (name: string) =>
  `Name: "${name}". For each language — ${GEMINI_LANGUAGES.join(", ")} — does a speaker recognise a meaning?
known=false + meaning="" when it means nothing in that language. Most invented names mean nothing almost everywhere; saying so is correct.
Never invent a plausible meaning.
sentiment: good = warm/auspicious, neutral = plain word, bad = crude/comic/unfortunate.
meaning: one short clause a parent can read, no linguistics.`;

interface RawReading { language?: string; known?: boolean; meaning?: string; sentiment?: string }

/**
 * What Gemini makes of the name, per language. Returns [] when the key is
 * absent, the call fails, or nothing is recognised — all of which the caller
 * reports as "not checked" rather than as "clear".
 */
export async function geminiReadings(name: string): Promise<GeminiReading[]> {
  // Unit tests never touch the network. A suite that needs Gemini up to pass
  // is a suite that fails on the train — and one slow call was enough to time
  // the whole run out.
  if (process.env.VITEST) return [];
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];

  const clean = name.trim().toLowerCase();
  if (!/^[a-z][a-z\s'-]{1,40}$/.test(clean)) return []; // roman names only

  try {
    return await withCache<GeminiReading[]>(`cache:gemini-meaning:${clean}`, CACHE_TTL, async () => {
      const res = await postGemini(
        {
          contents: [{ parts: [{ text: prompt(name.trim()) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
            temperature: 0, // same name, same answer, every time
          },
        },
        "meanings",
      );
      if (!res.ok) {
        logger.warn({ status: res.status }, "Gemini meaning lookup failed");
        throw new Error(`gemini_${res.status}`); // thrown, so a bad minute is not cached
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return [];

      const parsed = JSON.parse(text) as { readings?: RawReading[] };
      return (parsed.readings ?? [])
        .filter((r) => r.known === true && typeof r.meaning === "string" && r.meaning.trim().length > 0)
        .filter((r) => (GEMINI_LANGUAGES as readonly string[]).includes(r.language ?? ""))
        .map((r) => ({
          language: r.language as string,
          meaning: r.meaning!.trim(),
          sentiment: (["good", "neutral", "bad"].includes(r.sentiment ?? "")
            ? r.sentiment
            : "neutral") as GeminiReading["sentiment"],
        }));
    });
  } catch {
    return []; // absent, not wrong
  }
}

// ── Certificate prose ─────────────────────────────────────────────

/**
 * The one sentence Gemini is never allowed to write.
 *
 * When a name has no verified meaning there is nothing to compose from, so the
 * model is not called at all. Letting it improvise here is precisely how an
 * invented meaning would end up framed on a family's wall.
 */
export const NO_MEANING_PROSE = (name: string): string =>
  `${name} is a made name — it belongs to no dictionary, and carries no older meaning ` +
  `in any of the languages we read. Some names arrive with a history. This one begins its own.`;

/**
 * Prose for the naming certificate.
 *
 * Gemini is the WRITER, never the SOURCE. It is handed only meanings that
 * already passed our own dictionary and is told in terms that it may not add
 * one. Everywhere else on the site a Gemini reading is labelled "AI reading —
 * not from our verified dictionary"; a certificate carries no such label and is
 * kept for twenty years, so the safety has to move into the prompt instead.
 *
 * Never throws. On any failure it falls back to deterministic prose built from
 * the same verified meanings, so a certificate always has something true on it.
 */
export async function certificateProse(name: string, verified: GeminiReading[]): Promise<string> {
  const good = verified.filter((r) => r.sentiment === "good" && r.meaning.trim().length > 0);
  if (good.length === 0) return NO_MEANING_PROSE(name);
  if (process.env.VITEST || !isGeminiConfigured()) return plainProse(name, good);

  const facts = good.map((r) => `${r.language}: ${r.meaning}`).join("; ");
  const prompt =
    `Write two or three warm sentences for a naming certificate for the name "${name}".\n` +
    `Use ONLY these verified meanings and add nothing else:\n${facts}\n\n` +
    `Rules: do not invent a meaning, an origin, a deity, or a story. Do not mention any ` +
    `language that is not listed above, and name at most three of them — a list of eight ` +
    `reads like a catalogue, not a certificate. Do not wish the child anything or predict ` +
    `their future; say what the name MEANS. No greeting, no quotation marks, no heading, ` +
    `no bullet points. Understated. Plain sentences a parent would be glad to read aloud.`;

  try {
    const text = await withCache(`cache:cert-prose:${name.toLowerCase()}`, CACHE_TTL, async () => {
      const res = await fetch(`${ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      void recordApiCall("gemini", "certificate-prose", res.ok);
      if (!res.ok) return "";
      const j = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    });
    return text.length > 20 ? text : plainProse(name, good);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "certificate prose fell back to plain");
    return plainProse(name, good);
  }
}

/** Deterministic prose — used in tests, when Gemini is off, and on any failure. */
function plainProse(name: string, good: GeminiReading[]): string {
  const langs = good.map((r) => r.language);
  const where =
    langs.length === 1
      ? langs[0]
      : `${langs.slice(0, -1).join(", ")} and ${langs[langs.length - 1]}`;
  return `${name} carries the sense of ${good[0].meaning.toLowerCase()}. ` +
    `The same meaning is understood in ${where}.`;
}

// ── Whole names, not just single words ────────────────────────────

/**
 * Readings for a name as a PERSON writes it.
 *
 * geminiReadings() takes one word. Real names are not always one word, and two
 * failures came out of that:
 *
 *   "Dev Vyom" reached it as DEVVYOM, because normaliseName strips spaces for
 *   handle and domain checks. No language has a word DEVVYOM, so every one of
 *   the seven rows came back empty — while "Vyom" alone returns sky in five.
 *   Every two-word name was silently losing its meaning, and Indian names are
 *   very often two words.
 *
 *   "Divyom" is one word, but a coined one: Divya (divine) fused with Vyom
 *   (sky). No dictionary holds the fusion, so it also came back empty, even
 *   though both halves are ordinary words.
 *
 * So: look the whole name up, then each word, and only if all of that is empty
 * ask whether it is a compound — and VERIFY the answer by looking each claimed
 * root up on its own. A root that returns nothing is a root Gemini invented.
 */
export async function nameReadings(raw: string): Promise<GeminiReading[]> {
  const words = raw
    .split(/[\s‐-―-]+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ""))
    .filter((w) => w.length >= 2);
  if (words.length === 0) return [];

  // One word: ask directly. Several: ask about each, and merge.
  if (words.length > 1) {
    const per = await Promise.all(words.map((w) => geminiReadings(w)));
    const merged = mergeByLanguage(words, per);
    if (merged.length > 0) return merged;
  } else {
    const direct = await geminiReadings(words[0]);
    if (direct.length > 0) return direct;
  }

  return compoundReadings(words.length === 1 ? words[0] : words.join(""));
}

/**
 * One row per language, naming which part of the name carries which sense —
 * "Dev: god · Vyom: sky" reads better on a certificate than two competing rows
 * that both claim to be Hindi.
 */
function mergeByLanguage(words: string[], per: GeminiReading[][]): GeminiReading[] {
  const byLang = new Map<string, { parts: string[]; bad: boolean }>();
  per.forEach((readings, i) => {
    for (const r of readings) {
      const entry = byLang.get(r.language) ?? { parts: [], bad: false };
      entry.parts.push(`${words[i]}: ${r.meaning}`);
      if (r.sentiment === "bad") entry.bad = true;
      byLang.set(r.language, entry);
    }
  });
  return [...byLang.entries()].map(([language, v]) => ({
    language,
    meaning: v.parts.join(" · "),
    sentiment: (v.bad ? "bad" : "good") as GeminiReading["sentiment"],
  }));
}

/**
 * A coined name built from recognisable roots.
 *
 * Gemini proposes the split; we then look each root up SEPARATELY through the
 * ordinary path. Only roots that return a meaning of their own survive, and at
 * least two must survive before we say anything — which is what stops this
 * becoming a licence to decompose any string into flattering syllables.
 */

export interface BreakdownPart {
  /** The root as it is written, e.g. "Divya". */
  text: string;
  /** What that root means on its own — verified, not asserted by the splitter. */
  meaning: string;
  /** The languages the root's meaning was confirmed in. Evidence, not decoration. */
  languages: string[];
}

export interface NameBreakdown {
  parts: BreakdownPart[];
  /** How the parts read together: "divine" + "sky". */
  combined: string;
}

/**
 * Break a name into the smaller names it is built from.
 *
 * Divyom is Divya + Vyom — divine, and sky. A parent who searched it was being
 * told only "no meaning we could confirm", because nothing looked inside the
 * word. Founder's instruction, 22 Aug 2026: if a name can be broken from the
 * middle into two or three smaller names that together give a good meaning,
 * do that and show it.
 *
 * This runs even when the whole name HAS a reading of its own, because the
 * breakdown is interesting in itself — it is the thing a family repeats.
 *
 * Every part is verified independently before any of it is shown. The splitter
 * proposes; geminiReadings decides. A root nothing can confirm is dropped, and
 * fewer than two survivors means no breakdown at all — which is what stops a
 * name being sliced into flattering syllables that mean nothing.
 */
export async function nameBreakdown(raw: string): Promise<NameBreakdown | null> {
  const words = raw
    .split(/[\s\u2010-\u2015-]+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ""))
    .filter((w) => w.length >= 2);

  // A name already written as two words is its own breakdown; no model needed.
  const roots = words.length > 1 ? words.slice(0, 3) : await compoundParts(words[0] ?? "");
  if (roots.length < 2) return null;

  /*
   * Two sources, because one is not enough for short roots. Gemini returns
   * nothing at all for "Dev" — three letters is too little for it to commit
   * to — and that single silence was enough to sink the whole breakdown of
   * Dev Vyom, a name whose halves we hold in our own verified dictionary.
   */
  const [per, own] = await Promise.all([
    Promise.all(roots.map((r) => geminiReadings(r))),
    Promise.all(roots.map((r) => lookupMeaning(r).catch(() => null))),
  ]);

  const parts: BreakdownPart[] = [];
  roots.forEach((root, i) => {
    const good = per[i].filter((r) => r.sentiment !== "bad" && r.meaning.trim());
    if (good.length === 0) {
      const dict = own[i];
      if (dict?.meaning) {
        parts.push({ text: root, meaning: dict.meaning.trim().replace(/\.$/, ""), languages: ["our dictionary"] });
      }
      return;
    }
    // Shortest reading makes the cleanest line: "sky" over "sky, space, heaven".
    const best = [...good].sort((a, b) => a.meaning.length - b.meaning.length)[0];
    parts.push({
      text: root,
      meaning: best.meaning.trim().replace(/\.$/, ""),
      languages: good.map((r) => r.language),
    });
  });

  if (parts.length < 2) return null;
  return { parts, combined: parts.map((p) => p.meaning).join(" + ") };
}

/** The splitter, shared by nameBreakdown and the compound reading fallback. */
async function compoundParts(word: string): Promise<string[]> {
  if (process.env.VITEST || !isGeminiConfigured() || word.length < 5) return [];

  const prompt =
    `The Indian given name "${word}" may be a compound of two shorter names or ` +
    `Sanskrit roots. If it clearly is, reply with ONLY the parts separated by a ` +
    `space, for example: Divya Vyom. If it is not a compound, or you are unsure, ` +
    `reply with exactly: NONE`;

  try {
    const parts = await withCache(`cache:compound:${word.toLowerCase()}`, CACHE_TTL, async () => {
      const res = await postGemini(
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 40 } },
        "compound-split",
      );
      // Thrown, not returned. Returning "" here cached a rate limit as the
      // permanent answer "this name does not split" — for 180 days. It is the
      // same trap geminiReadings avoids by throwing, and it is why Divyom
      // stopped breaking into Divya + Vyom after one bad minute.
      if (!res.ok) throw new Error(`gemini_${res.status}`);
      const j = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    });
    if (!parts || /NONE/i.test(parts)) return [];
    return parts
      .split(/\s+/)
      .map((p) => p.replace(/[^A-Za-z]/g, ""))
      // Two letters, not three. Om is a root, and a three-letter floor discarded
      // it — which is why Divyom, split correctly as Divya + Om, arrived with one
      // part and therefore no breakdown at all.
      .filter((p) => p.length >= 2)
      .slice(0, 3);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "compound split failed");
    return [];
  }
}
async function compoundReadings(word: string): Promise<GeminiReading[]> {
  const roots = await compoundParts(word);
  if (roots.length < 2) return [];

  // Verify: every claimed root must stand up on its own.
  const per = await Promise.all(roots.map((r) => geminiReadings(r)));
  const survivors = roots.filter((_, i) => per[i].length > 0);
  if (survivors.length < 2) return [];

  return mergeByLanguage(roots, per);
}
