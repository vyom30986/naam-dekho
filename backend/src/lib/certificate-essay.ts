/**
 * The ~150-word passage on the shortlist certificate.
 *
 * Distinct from `certificateProse()`, which writes two or three sentences for
 * the single-name sheet. That length is right for a one-page keepsake and wrong
 * for this one: the founder asked for "a proper 150-word paragraph… not just
 * showing how the meaning changes or stays the same in different languages, but
 * beautifying it a little more."
 *
 * The instruction that makes it work is the one about agreement. For a name
 * like Aarav every language returns the same reading, and a per-language table
 * then prints four rows saying "peaceful" in slightly different words. Told to
 * notice that agreement and make it the heart of the paragraph, the model opens
 * on the fact that a single name means the same thing from Punjab to Gujarat —
 * which is the interesting thing, and the thing a table cannot say.
 *
 * Everything else is a fence. It may use only the meanings our own checks
 * confirmed; it may not supply an origin, a deity, a scripture or an etymology;
 * it may not wish the child anything or predict their life.
 */
import { logger } from "../logger.js";
import { withCache } from "../cache/redis.js";
import { sandhiSentence, type SandhiReading } from "./sandhi.js";
import { isGeminiConfigured, postGemini, type GeminiReading } from "./gemini.js";

/** 180 days: the same name yields the same passage, and it is not cheap to write. */
const CACHE_TTL = 180 * 24 * 3600;

export interface EssayInput {
  name: string;
  /** Verified readings. Only `sentiment: "good"` ones are ever shown a model. */
  readings: GeminiReading[];
  /** "boy" | "girl" | undefined. Optional, and absence is handled explicitly. */
  gender?: string;
  /**
   * What the name says when taken apart — संधि विच्छेद.
   *
   * The essay used to see only per-language readings, so a name no language
   * recognised whole was declared "a made name" without anyone having tried
   * to split it. Rivaan is रि + वान. Devendra is देव + इन्द्र. Those are
   * readings, and they belong on the certificate.
   */
  sandhi?: SandhiReading | null;
}

function buildPrompt({ name, readings, gender, sandhi }: EssayInput): string {
  const facts = readings.map((r) => `${r.language}: ${r.meaning}`).join("; ");

  /* The split is offered as another verified fact, not as a licence to
     speculate: the parts and the rule were checked before they got here. */
  const split = sandhiSentence(sandhi ?? null);

  /*
   * The gender line is not decoration. Left to itself the model reaches for a
   * pronoun and picks one: the first live run wrote "a child who arrives into
   * the world bearing quietness within his very name" for a name nobody had
   * told it the gender of. On a certificate that is printed and framed, a
   * guessed pronoun is a real mistake, so either we know or we forbid it.
   */
  const pronoun =
    gender === "boy"
      ? "The child is a boy; you may write he or him."
      : gender === "girl"
        ? "The child is a girl; you may write she or her."
        : "You have NOT been told the child's gender. Do not write he, she, him, her, his or hers " +
          "anywhere. Write about the name itself, or say 'the child', and never guess.";

  return [
    `Write a single paragraph of about 150 words for a naming certificate, about the name "${name}".`,
    "",
    "These are the ONLY meanings you may use, and they came from our own verified checks:",
    facts || "(no language recognised the name as a whole word)",
    ...(split
      ? [
          "",
          "The name also reads when taken apart, and this too is verified:",
          split,
          "Use it. A name whose parts carry meaning is not a name without meaning.",
        ]
      : []),
    "",
    "How to write it:",
    "- Notice whether the meanings agree across the languages. If they largely do, make that the " +
      "heart of the paragraph — that one name means the same thing from Punjab to Bengal is itself " +
      "worth remarking on, and it is the most beautiful thing about such a name.",
    "- Where a language differs, treat it as another facet, not a contradiction.",
    "- Write about what the name MEANS, and how it sounds and feels to say. Warm, unhurried, plain. " +
      "The kind of paragraph a family would read aloud at a namkaran.",
    "",
    pronoun,
    "",
    "Rules: invent nothing — no origin story, no deity, no scripture, no etymology we did not give " +
      "you. Do not predict the child's future or wish them anything. Do not list the languages like " +
      "a catalogue. One paragraph, no heading, no bullet points, no quotation marks. About 150 words.",
  ].join("\n");
}

/**
 * A plain passage, assembled from the readings without a model.
 *
 * Used when Gemini is unconfigured, unreachable, or under test. Deliberately
 * modest: it states what we know and stops. A fallback that tried to sound
 * like the real thing would be the worst of both — invented warmth over thin
 * facts, printed on something a family keeps.
 */
function plainEssay(name: string, readings: GeminiReading[], sandhi?: SandhiReading | null): string {
  const split = sandhiSentence(sandhi ?? null);
  if (readings.length === 0 && split) {
    /* No language knew the whole word, but it came apart cleanly. That is a
       reading, and it is the one the family came for. */
    return `${name} is not a word the dictionaries carry whole, but it is not without meaning either. ${split} A name built this way is chosen rather than inherited, and the choosing is the point.`;
  }
  if (readings.length === 0) {
    /* Never 'it belongs to no dictionary'. We read a fixed set of languages
       and attempt one split; finding nothing is a limit of our checking, not
       a fact about the child's name. Say what we did, not what the name is. */
    return `${name} did not turn up in the dictionaries we read, and it did not divide into parts we could vouch for. That is the honest limit of our checking rather than a verdict on the name — many names carried for generations sit outside a dictionary.`;
  }
  const first = readings[0].meaning.replace(/\.$/, "");
  const langs = readings.map((r) => r.language);
  const list =
    langs.length === 1
      ? langs[0]
      : `${langs.slice(0, -1).join(", ")} and ${langs[langs.length - 1]}`;
  const agreed = readings.every(
    (r) => r.meaning.trim().toLowerCase() === readings[0].meaning.trim().toLowerCase(),
  );
  return agreed && langs.length > 1
    ? `In ${list} alike, ${name} means ${first} — the same reading in every one of them, which is not something every name can claim.`
    : `${name} is read as ${first} in ${langs[0]}, and carries related senses in ${list}.`;
}

/** How many words we will accept before treating the answer as a failure. */
const MIN_WORDS = 60;

export async function certificateEssay(input: EssayInput): Promise<string> {
  const good = input.readings.filter(
    (r) => r.sentiment === "good" && r.meaning.trim().length > 0,
  );
  if (process.env.VITEST || !isGeminiConfigured()) return plainEssay(input.name, good, input.sandhi);
  if (good.length === 0 && !input.sandhi) return plainEssay(input.name, good, input.sandhi);

  const key = `cache:cert-essay:v2:${input.name.toLowerCase()}:${input.gender ?? "any"}`;

  try {
    const text = await withCache(key, CACHE_TTL, async () => {
      const res = await postGemini(
        {
          contents: [{ parts: [{ text: buildPrompt({ ...input, readings: good }) }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 500 },
        },
        "certificate-essay",
      );
      if (!res.ok) throw new Error(`gemini_${res.status}`); // thrown, so a bad minute is not cached
      const j = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    });

    // A truncated or empty answer is worse than a short honest one.
    if (text.split(/\s+/).filter(Boolean).length < MIN_WORDS) {
      return plainEssay(input.name, good, input.sandhi);
    }
    return text;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "certificate essay fell back to plain");
    return plainEssay(input.name, good, input.sandhi);
  }
}
