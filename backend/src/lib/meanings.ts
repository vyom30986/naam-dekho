import { withCache } from "../cache/redis.js";
import { VERIFIED_MEANINGS } from "./meanings-data.js";

/**
 * Name meanings — the honest way.
 *
 * Two layers, in order:
 *   1. VERIFIED_MEANINGS — an offline dataset covering the pilot corpus, each
 *      entry verified against a citable source (see meanings-data.ts for the
 *      per-entry citation). No network, no latency, no surprises.
 *   2. Wiktionary live lookup — for names outside the dataset. We take only
 *      what the page actually states, credit it, and cache it for 30 days.
 *
 * When neither layer knows, the answer is null and the tile says so. A name
 * product that invents meanings to fill space is indistinguishable from the
 * astrology-mill sites we exist to replace.
 */

export interface NameMeaning {
  meaning: string;
  origin?: string;
  source: string; // where a customer could check it themselves
  sourceUrl?: string;
}

export async function lookupMeaning(name: string): Promise<NameMeaning | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const offline = VERIFIED_MEANINGS[key];
  if (offline) return offline;
  return wiktionaryMeaning(name);
}

// Wiktionary language codes we treat as origin languages for Indian names —
// a gloss in one of these sections is a real meaning ("peace"), while the
// English section usually only says "a male given name".
const MEANING_SECTIONS = new Set([
  "hindi", "sanskrit", "marathi", "tamil", "telugu", "kannada", "malayalam",
  "bengali", "gujarati", "punjabi", "urdu", "persian", "arabic", "nepali",
]);

const BOILERPLATE = /^(a |an )?(male |female |unisex )?given name/i;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

interface WiktionaryDefinition { definition?: string }
interface WiktionarySection { partOfSpeech?: string; language?: string; definitions?: WiktionaryDefinition[] }

/**
 * The REST definition API returns sections keyed by language code. We prefer
 * a real gloss from an Indic/Persian/Arabic section; failing that, an English
 * given-name line is used only when it carries actual content beyond the
 * boilerplate ("A male given name from Sanskrit meaning …").
 */
async function wiktionaryMeaning(name: string): Promise<NameMeaning | null> {
  // Unit tests never touch the network — a test suite that needs Wiktionary
  // up to pass is a test suite that fails on the train.
  if (process.env.VITEST) return null;
  const clean = name.trim().replace(/\s+/g, "_");
  if (!/^[A-Za-z_]{2,40}$/.test(clean)) return null; // only roman single names
  const title = clean[0].toUpperCase() + clean.slice(1).toLowerCase();

  // withCache treats null as a miss, so definitive misses are stored as
  // {none:true} — otherwise every search for a meaning-less name would
  // refetch Wiktionary. Transient failures (network, 5xx, 429) THROW instead,
  // so they are never cached: a flaky minute must not hide a name's meaning
  // for 30 days.
  try {
    const cached = await withCache<{ none: true } | NameMeaning>(
      `cache:meaning:${title.toLowerCase()}`,
      30 * 24 * 3600,
      async () => {
        // Wiktionary titles are case-sensitive: given names sit at "Kavya"
        // but the Indic common noun sits at "kavya" — and the noun is where
        // the actual meaning lives. Try both; 404 on both = definitive miss.
        for (const t of [title, title.toLowerCase()]) {
          const res = await fetch(
            `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(t)}`,
            {
              headers: { "User-Agent": "NaamDekho/1.0 (https://naamdekho.net; hello@naamdekho.in)" },
              signal: AbortSignal.timeout(6_000),
            },
          );
          if (res.status === 404) continue; // this casing absent — try the next
          if (!res.ok) throw new Error(`wiktionary_${res.status}`); // transient — do not cache
          const data = (await res.json()) as Record<string, WiktionarySection[]>;
          const url = `https://en.wiktionary.org/wiki/${t}`;

          // Pass 1 — a real gloss from an origin-language section
          for (const sections of Object.values(data)) {
            for (const sec of sections) {
              if (!MEANING_SECTIONS.has((sec.language ?? "").toLowerCase())) continue;
              for (const def of sec.definitions ?? []) {
                const text = stripHtml(def.definition ?? "");
                if (text && !BOILERPLATE.test(text) && text.length >= 3 && text.length <= 160) {
                  return { meaning: text, origin: sec.language, source: "en.wiktionary.org", sourceUrl: url };
                }
              }
            }
          }

          // Pass 2 — an English given-name line, but ONLY when it actually
          // states a meaning. "A female given name transferred from the place
          // name" (the Irish Tara) passed a looser filter in testing — a line
          // about a DIFFERENT bearer of the name is worse than no line.
          for (const sec of data.en ?? []) {
            for (const def of sec.definitions ?? []) {
              const text = stripHtml(def.definition ?? "");
              if (BOILERPLATE.test(text) && /meaning/i.test(text) && text.length <= 200) {
                return { meaning: text, origin: undefined, source: "en.wiktionary.org", sourceUrl: url };
              }
            }
          }
          // Page exists but holds no usable sense — the other casing may still
        }
        return { none: true };
      },
    );
    return "none" in cached ? null : cached;
  } catch {
    return null; // this scan shows no meaning; the next one retries
  }
}
