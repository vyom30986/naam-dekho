/**
 * The pilot corpus for the name pages (pSEO phase 1 — 50 pages).
 *
 * Deliberately small. The plan is: publish 50, watch what Google actually
 * indexes and ranks for 4-6 weeks, and only then scale. Publishing thousands
 * of pages before knowing the format works is how sites earn thin-content
 * penalties.
 *
 * `meaning` is filled in ONLY where we genuinely know it. A blank meaning
 * renders as nothing on the page — we never invent one to fill the template.
 */

export interface CorpusName {
  name: string;
  gender?: "boy" | "girl" | "unisex";
  origin?: string;
  meaning?: string;
  /* Where the meaning came from, and where a reader can go and check it.
     Carried onto the page: a meaning we assert without saying who says so is
     the same claim the astrology mills make. */
  /* The verified Devanagari spelling, when we have one. */
  nativeSpelling?: string;
  meaningSource?: string;
  meaningUrl?: string;
}

export const NAME_CORPUS: CorpusName[] = [
  { name: "Aarav", gender: "boy", origin: "Sanskrit", meaning: "peaceful; a calm sound" },
  { name: "Vivaan", gender: "boy", origin: "Sanskrit", meaning: "full of life; the first rays of the sun" },
  { name: "Aditya", gender: "boy", origin: "Sanskrit", meaning: "the sun; son of Aditi" },
  { name: "Vihaan", gender: "boy", origin: "Sanskrit", meaning: "dawn; the beginning of a new era" },
  { name: "Arjun", gender: "boy", origin: "Sanskrit", meaning: "bright, shining; the Mahabharata hero" },
  { name: "Reyansh", gender: "boy", origin: "Sanskrit", meaning: "a ray of light; part of Lord Vishnu" },
  { name: "Ayaan", gender: "boy", origin: "Persian/Arabic", meaning: "gift of God; a period of time" },
  { name: "Krishna", gender: "boy", origin: "Sanskrit", meaning: "dark-complexioned; the eighth avatar of Vishnu" },
  { name: "Ishaan", gender: "boy", origin: "Sanskrit", meaning: "the sun; a name of Lord Shiva" },
  { name: "Shaurya", gender: "boy", origin: "Sanskrit", meaning: "valour, bravery" },
  { name: "Atharv", gender: "boy", origin: "Sanskrit", meaning: "the first Veda; knowledge" },
  { name: "Advik", gender: "boy", origin: "Sanskrit", meaning: "unique, one of a kind" },
  { name: "Rudra", gender: "boy", origin: "Sanskrit", meaning: "a name of Lord Shiva; the fierce one" },
  { name: "Kabir", gender: "boy", origin: "Arabic/Hindi", meaning: "great, noble; the saint-poet" },
  { name: "Ansh", gender: "boy", origin: "Sanskrit", meaning: "a portion; part of something greater" },
  { name: "Yuvan", gender: "boy", origin: "Sanskrit", meaning: "young, healthy" },
  { name: "Devansh", gender: "boy", origin: "Sanskrit", meaning: "part of God" },
  { name: "Kian", gender: "boy", origin: "Persian", meaning: "king; grace" },
  { name: "Rohit", gender: "boy", origin: "Sanskrit", meaning: "red; the first rays of the sun" },
  { name: "Neel", gender: "boy", origin: "Sanskrit", meaning: "blue; sapphire" },
  { name: "Ojas", gender: "boy", origin: "Sanskrit", meaning: "vitality, lustre, spiritual energy" },
  { name: "Parth", gender: "boy", origin: "Sanskrit", meaning: "a name of Arjuna; son of Pritha" },
  { name: "Samar", gender: "boy", origin: "Sanskrit/Arabic", meaning: "battle; fruit of effort" },
  { name: "Veer", gender: "boy", origin: "Sanskrit", meaning: "brave, courageous" },
  { name: "Dhruv", gender: "boy", origin: "Sanskrit", meaning: "the pole star; constant, unshakeable" },

  { name: "Ananya", gender: "girl", origin: "Sanskrit", meaning: "unique; without equal" },
  { name: "Aadhya", gender: "girl", origin: "Sanskrit", meaning: "the first power; a name of Devi" },
  { name: "Saanvi", gender: "girl", origin: "Sanskrit", meaning: "a name of Goddess Lakshmi" },
  { name: "Aaradhya", gender: "girl", origin: "Sanskrit", meaning: "worshipped; one who is adored" },
  { name: "Anika", gender: "girl", origin: "Sanskrit", meaning: "grace; a name of Durga" },
  { name: "Priya", gender: "girl", origin: "Sanskrit", meaning: "beloved, dear one" },
  { name: "Diya", gender: "girl", origin: "Sanskrit", meaning: "a lamp; light" },
  { name: "Myra", gender: "girl", origin: "Sanskrit/Latin", meaning: "sweet; admirable" },
  { name: "Kiara", gender: "girl", origin: "Italian/Sanskrit", meaning: "bright, light" },
  { name: "Shreya", gender: "girl", origin: "Sanskrit", meaning: "auspicious; the most excellent" },
  { name: "Ishita", gender: "girl", origin: "Sanskrit", meaning: "mastery; one who desires" },
  { name: "Riya", gender: "girl", origin: "Sanskrit", meaning: "singer; graceful" },
  { name: "Avni", gender: "girl", origin: "Sanskrit", meaning: "the earth" },
  { name: "Meera", gender: "girl", origin: "Sanskrit", meaning: "prosperous; the devotee-poet of Krishna" },
  { name: "Nitya", gender: "girl", origin: "Sanskrit", meaning: "eternal, constant" },
  { name: "Tara", gender: "girl", origin: "Sanskrit", meaning: "star" },
  { name: "Vaani", gender: "girl", origin: "Sanskrit", meaning: "speech; a name of Saraswati" },
  { name: "Aisha", gender: "girl", origin: "Arabic", meaning: "alive; prosperous" },
  { name: "Navya", gender: "girl", origin: "Sanskrit", meaning: "new, young, worth praising" },
  { name: "Pari", gender: "girl", origin: "Persian", meaning: "fairy; angel" },
  { name: "Sara", gender: "girl", origin: "Hebrew/Arabic", meaning: "pure; princess" },
  { name: "Anvi", gender: "girl", origin: "Sanskrit", meaning: "a name of Goddess Lakshmi; one who follows" },
  { name: "Ira", gender: "girl", origin: "Sanskrit", meaning: "the earth; a name of Saraswati" },
  { name: "Kavya", gender: "girl", origin: "Sanskrit", meaning: "poetry; a poem" },
  { name: "Lakshmi", gender: "girl", origin: "Sanskrit", meaning: "goddess of wealth and fortune" },
];

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
