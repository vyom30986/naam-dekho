/**
 * What a name means in each Indian language — the good and the unfortunate.
 *
 * A name that is lovely in Hindi can be crude in Tamil. This is the layer
 * Western naming tools skip entirely, and for a family choosing a name before
 * a namkaran it is often the check that matters most: nobody wants to find
 * out at school.
 *
 * THREE RULES, all learned the hard way:
 *
 * 1. FALSE ALARMS ARE WORSE THAN MISSES. Flagging a beautiful name because a
 *    fragment resembles something rude insults the family and teaches them to
 *    ignore the check. Every entry below was proposed by one research pass,
 *    independently challenged by a second that had to prove it would not
 *    misfire, and finally tested against a 536-name corpus of real Indian
 *    names. Anything that fired on a real name was narrowed or dropped.
 *
 * 2. `whole: true` means the pattern must BE the whole name. Fragments that
 *    only carry their meaning as a complete word (tara = star) must never
 *    match inside a longer name, or Tarachand becomes "star" and Sitara
 *    becomes a false hit.
 *
 * 3. A LANGUAGE WITH NO ENTRIES IS REPORTED AS UNCHECKED, never as clear.
 *    Coverage is stated honestly on every result.
 */

export type Sentiment = "good" | "neutral" | "bad";

export interface LanguageEntry {
  /** Lowercase roman letters as they appear inside a transliterated name. */
  pattern: string;
  /** Plain English, written to be read by a parent. */
  meaning: string;
  sentiment: Sentiment;
  /** true = must match the whole name; false = may appear inside a longer one. */
  whole: boolean;
}

/**
 * Unfortunate meanings. Verified 4 Aug 2026; each entry survived an
 * independent challenge and a false-positive sweep over 536 real names.
 */
const BAD: Record<string, LanguageEntry[]> = {
  Hindi: [
    { pattern: "lauda", whole: false, sentiment: "bad", meaning: "Another crude Hindi word for the male private parts - easy to hit by accident with Latin-sounding brand names" },
    { pattern: "choda", whole: false, sentiment: "bad", meaning: "Matches the crudest Hindi verb for having sex" },
    { pattern: "kutti", whole: false, sentiment: "bad", meaning: "Sounds like the female form of \"dog\", used as an insult across North India, though it means \"little one\" in Tamil and Malayalam" },
    { pattern: "tatti", whole: false, sentiment: "bad", meaning: "Sounds like the children's word for poo - guaranteed playground teasing" },
  ],
  Tamil: [
    { pattern: "punda", whole: false, sentiment: "bad", meaning: "Contains the most offensive Tamil word for a woman's private parts." },
    { pattern: "koothi", whole: false, sentiment: "bad", meaning: "Reads as a very crude Tamil word for a woman's private parts." },
    { pattern: "thayoli", whole: false, sentiment: "bad", meaning: "Reads as one of the harshest Tamil swear words, an insult aimed at someone's mother." },
    { pattern: "poolu", whole: false, sentiment: "bad", meaning: "Reads as a crude Tamil word for a man's private parts." },
    { pattern: "mayir", whole: false, sentiment: "bad", meaning: "Reads as a common Tamil swear word, used the way English speakers use a four-letter word." },
    { pattern: "soothu", whole: false, sentiment: "bad", meaning: "Crude Tamil word for the buttocks." },
  ],
  Bengali: [
    { pattern: "gaand", whole: false, sentiment: "bad", meaning: "Sounds like the crude Bengali word for backside." },
    { pattern: "peshab", whole: false, sentiment: "bad", meaning: "Sounds like the Bengali word for urine." },
    { pattern: "pagla", whole: false, sentiment: "bad", meaning: "Sounds like the Bengali word for a mad or crazy person." },
    { pattern: "nongra", whole: false, sentiment: "bad", meaning: "Sounds like the Bengali word for dirty or filthy." },
    { pattern: "bhonda", whole: false, sentiment: "bad", meaning: "Sounds like the Bengali word for a fraud or hypocrite, someone putting on a false show." },
    { pattern: "thoot", whole: false, sentiment: "bad", meaning: "Sounds like the Bengali word for spit or spittle." },
  ],
  Marathi: [
    { pattern: "bhosad", whole: false, sentiment: "bad", meaning: "The opening of the crudest swear word in Marathi — an obscene word for a woman's private parts." },
    { pattern: "gandu", whole: false, sentiment: "bad", meaning: "A coarse insult, roughly equivalent to \"arsehole\"." },
    { pattern: "lavda", whole: false, sentiment: "bad", meaning: "A vulgar street word for the male private part." },
    { pattern: "bhadva", whole: false, sentiment: "bad", meaning: "A harsh Marathi abuse meaning \"pimp\"." },
    { pattern: "chavat", whole: false, sentiment: "bad", meaning: "Marathi for someone lewd or dirty-minded." },
    { pattern: "halkat", whole: false, sentiment: "bad", meaning: "A common Marathi insult meaning cheap, nasty and despicable." },
    { pattern: "dukkar", whole: false, sentiment: "bad", meaning: "Marathi for pig, and a routine insult for someone dirty or greedy." },
    { pattern: "bhikar", whole: false, sentiment: "bad", meaning: "Sounds like the Marathi word for beggarly — shabby, worthless, second-rate." },
    { pattern: "chaddi", whole: false, sentiment: "bad", meaning: "The everyday word for underpants — hard for a Marathi speaker to hear with a straight face." },
    { pattern: "tatti", whole: false, sentiment: "bad", meaning: "A childish but crude word for faeces, understood everywhere in Maharashtra." },
  ],
  Telugu: [
    { pattern: "puku", whole: false, sentiment: "bad", meaning: "Sounds like a very crude Telugu word for female genitals." },
    { pattern: "pooku", whole: false, sentiment: "bad", meaning: "The same very crude Telugu word for female genitals, in its longer spelling." },
    { pattern: "denga", whole: false, sentiment: "bad", meaning: "Sounds like an extremely vulgar Telugu word for the sexual act." },
    { pattern: "dengu", whole: false, sentiment: "bad", meaning: "Another form of the same extremely vulgar Telugu word for the sexual act." },
    { pattern: "pichi", whole: false, sentiment: "bad", meaning: "Sounds like the Telugu word for mad or crazy." },
    { pattern: "kampu", whole: false, sentiment: "bad", meaning: "The Telugu word for a bad smell or stench." },
    { pattern: "gabbu", whole: false, sentiment: "bad", meaning: "Telugu for a foul, rotten stink." },
  ],
  Gujarati: [
    { pattern: "gandu", whole: false, sentiment: "bad", meaning: "A very crude street insult across Gujarat; in plain Gujarati it also means a mad or foolish person." },
    { pattern: "gando", whole: false, sentiment: "bad", meaning: "Sounds exactly like the Gujarati word for a crazy or mad person." },
    { pattern: "bhosad", whole: false, sentiment: "bad", meaning: "An extremely vulgar word for a woman's private part; the root of a common swear word." },
    { pattern: "bhosdi", whole: false, sentiment: "bad", meaning: "Part of one of the coarsest swear words in everyday use, aimed at someone's mother." },
    { pattern: "lodo", whole: false, sentiment: "bad", meaning: "Coarse slang for the male private part, especially in Saurashtra." },
    { pattern: "tatti", whole: false, sentiment: "bad", meaning: "The ordinary word for human waste, the one children use for 'poo'." },
    { pattern: "chaddi", whole: false, sentiment: "bad", meaning: "Means underpants." },
    { pattern: "mutar", whole: false, sentiment: "bad", meaning: "Sounds like the Gujarati word for urine." },
  ],
  Punjabi: [
    { pattern: "gandu", whole: false, sentiment: "bad", meaning: "Sounds like a crude insult for a man, close to \"arsehole\"" },
    { pattern: "kutti", whole: false, sentiment: "bad", meaning: "Means \"female dog\" and is used as a real insult against a woman" },
    { pattern: "tatti", whole: false, sentiment: "bad", meaning: "The everyday children's word for poo, so it raises an instant laugh" },
  ],
};

/**
 * Positive and neutral meanings — what the name actually says in each
 * language. This is what turns the check from a warning light into an answer
 * to "what does my name mean in Tamil?".
 */
const GOOD: Record<string, LanguageEntry[]> = {
  Hindi: [
    { pattern: "jyoti", whole: true, sentiment: "good", meaning: "Light, a flame." },
    { pattern: "surya", whole: true, sentiment: "good", meaning: "The sun." },
    { pattern: "kiran", whole: true, sentiment: "good", meaning: "A ray of light." },
    { pattern: "tara", whole: true, sentiment: "good", meaning: "A star." },
    { pattern: "prakash", whole: false, sentiment: "good", meaning: "Light, brightness." },
    { pattern: "chandra", whole: false, sentiment: "good", meaning: "The moon." },
    { pattern: "deep", whole: false, sentiment: "good", meaning: "A lamp; light." },
  ],
  Tamil: [
  ],
  Bengali: [
  ],
  Marathi: [
  ],
  Telugu: [
  ],
  Gujarati: [
  ],
  Punjabi: [
    { pattern: "jas", whole: true, sentiment: "good", meaning: "Praise, fame, glory — in Sikh usage, the praise of God." },
    { pattern: "bir", whole: true, sentiment: "good", meaning: "Brave; a warrior, a hero." },
    { pattern: "jag", whole: true, sentiment: "neutral", meaning: "The world; the universe." },
    { pattern: "amar", whole: true, sentiment: "good", meaning: "Immortal, everlasting." },
    { pattern: "nav", whole: true, sentiment: "neutral", meaning: "New, fresh." },
    { pattern: "raj", whole: true, sentiment: "good", meaning: "Rule, reign, a kingdom — as a name, king or royal." },
    { pattern: "sat", whole: true, sentiment: "good", meaning: "Truth — true, real, everlasting, as in Satnam, the True Name." },
    { pattern: "kul", whole: true, sentiment: "neutral", meaning: "Family, lineage, clan." },
    { pattern: "bal", whole: true, sentiment: "good", meaning: "Strength, power, might." },
    { pattern: "rup", whole: true, sentiment: "good", meaning: "Form and appearance, and by extension beauty." },
    { pattern: "param", whole: true, sentiment: "good", meaning: "Supreme, the highest." },
    { pattern: "amrit", whole: true, sentiment: "good", meaning: "The nectar of immortality — the holy amrit of Sikh initiation." },
    { pattern: "karam", whole: true, sentiment: "good", meaning: "Grace, divine blessing; also good deeds and destiny." },
    { pattern: "kaur", whole: true, sentiment: "good", meaning: "Princess — the title Guru Gobind Singh gave every Sikh woman, marking her as royalty in her own right." },
    { pattern: "singh", whole: true, sentiment: "good", meaning: "Lion." },
    { pattern: "tara", whole: true, sentiment: "good", meaning: "A star." },
    { pattern: "jyoti", whole: true, sentiment: "good", meaning: "Light, a flame." },
    { pattern: "arjun", whole: true, sentiment: "good", meaning: "Bright, shining — and the great archer of the Mahabharata." },
    { pattern: "anmol", whole: true, sentiment: "good", meaning: "Priceless, beyond value." },
    { pattern: "santokh", whole: true, sentiment: "good", meaning: "Contentment." },
    { pattern: "onkar", whole: true, sentiment: "good", meaning: "The One Creator — the single divine reality, from Ik Onkar." },
    { pattern: "karan", whole: true, sentiment: "good", meaning: "Generous giver — after Karna, who never refused a request." },
    { pattern: "meet", whole: false, sentiment: "good", meaning: "Friend." },
    { pattern: "veer", whole: false, sentiment: "good", meaning: "Brave; a warrior." },
    { pattern: "sukh", whole: false, sentiment: "good", meaning: "Happiness, comfort, peace." },
    { pattern: "noor", whole: false, sentiment: "good", meaning: "Light, radiance." },
    { pattern: "simran", whole: false, sentiment: "good", meaning: "Loving remembrance of God." },
    { pattern: "jot", whole: false, sentiment: "good", meaning: "Light, a divine flame." },
    { pattern: "kiran", whole: false, sentiment: "good", meaning: "A ray of light." },
    { pattern: "dev", whole: false, sentiment: "good", meaning: "God; divine." },
    { pattern: "prem", whole: false, sentiment: "good", meaning: "Love, affection." },
    { pattern: "tej", whole: false, sentiment: "good", meaning: "Radiance, brilliance." },
    { pattern: "anand", whole: false, sentiment: "good", meaning: "Bliss, deep joy." },
    { pattern: "mehar", whole: false, sentiment: "good", meaning: "Grace, mercy — especially divine kindness." },
    { pattern: "khush", whole: false, sentiment: "good", meaning: "Happy, joyful." },
    { pattern: "gagan", whole: false, sentiment: "neutral", meaning: "The sky." },
    { pattern: "fateh", whole: false, sentiment: "good", meaning: "Victory." },
  ],
};

/** Everything we know, per language: the unfortunate first, then the good. */
export const LANDMINES: Record<string, LanguageEntry[]> = Object.fromEntries(
  Object.keys(BAD).map((lang) => [lang, [...(BAD[lang] ?? []), ...(GOOD[lang] ?? [])]]),
);

export function landmineCount(): number {
  return Object.values(LANDMINES).reduce((n, list) => n + list.length, 0);
}
