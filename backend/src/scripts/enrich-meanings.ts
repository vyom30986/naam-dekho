import "dotenv/config";
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { corpusNames } from "../db/schema.js";
import { postGemini } from "../lib/gemini.js";
import { logger } from "../logger.js";

/**
 * Fill in the meanings and Devanagari spellings for the name corpus.
 *
 * This produced the 210 sourced meanings currently in the database. It is here
 * so the team can run it again for names added later, and so the method is
 * inspectable rather than folklore.
 *
 * WHY IT IS SHAPED THIS WAY. The obvious approach, asking a model for 486
 * meanings and marking them verified, would destroy the one thing this product
 * sells, which is that it does not guess. So the two jobs are separated:
 *
 *   SPELLING is asked of Gemini. That is a transliteration fact, and our own
 *   transliterator gets it wrong often: it renders Raja as रजा, whose
 *   dictionary entry is "leave of absence", when the name is राजा, "king".
 *   Roman spelling does not record vowel length, so it cannot be recovered by
 *   rule. Measured across the corpus, 63% came out wrong.
 *
 *   MEANING is taken from Wiktionary at that spelling, and the page URL is
 *   kept, so every published meaning is something a reader can go and check.
 *
 * A third step cross checks the two. A dictionary headword that matches a
 * name's spelling is not always the name's sense: मीरा glosses as "murva", a
 * fibre plant, and अशोक as the ashoka tree rather than "without sorrow".
 * Publishing those would be citable and wrong, so a gloss that does not match
 * the name's understood sense is rejected and demoted to a proposal.
 *
 * Nothing here sets verified=true on a model's say so. A row only becomes
 * verified when an outside source states the meaning at a spelling we checked.
 * Everything else lands in the console's review queue at /admin/corpus for a
 * human to approve.
 *
 *   npm run enrich:meanings -- --dry                 report only, writes nothing
 *   npm run enrich:meanings -- --write               apply
 *   npm run enrich:meanings -- --write --redo        also re-process rows this
 *                                                    script filled before
 *   npm run enrich:meanings -- --dry --limit=40      a quick sample
 *   npm run enrich:meanings -- --write --report=out.json
 *
 * Needs GEMINI_API_KEY and a reachable database. Expect roughly one Gemini
 * call per 20 names plus one Wiktionary request per name, so a full run over
 * 486 names takes some minutes and is polite to both services.
 */

const WRITE = process.argv.includes("--write");
/** Re-process rows this script already filled, so a bad run can be undone. */
const REDO = process.argv.includes("--redo");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);
const REPORT = process.argv.find((a) => a.startsWith("--report="))?.split("=")[1];

const UA = "NaamDekho/1.0 (https://naamdekho.net; hello@naamdekho.in)";

/** Rows this script has written before, identified by the source it stamps. */
const OURS = new Set(["en.wiktionary.org", "Gemini proposal — needs review"]);

const strip = (h: string) =>
  h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

/* "A male given name" is a label, not a meaning. "Inflection of X" is a verb
   form that happens to share the spelling. Both are rejected. */
const BOILER = /^(a |an )?(male |female |unisex )?(given name|surname)/i;
const NOT_A_MEANING =
  /^(inflection|alternative (form|spelling)|romanization|romanisation|plural|synonym) of\b/i;

const GLOSS_LANGS = new Set([
  "Hindi", "Sanskrit", "Marathi", "Pali", "Bengali",
  "Gujarati", "Punjabi", "Nepali", "Urdu", "Persian", "Arabic",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gemini<T>(prompt: string, schema: unknown, label: string): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await postGemini(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0,
        },
      },
      label,
    );
    if (res.ok) {
      const j = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) { try { return JSON.parse(t) as T } catch { /* malformed, retry */ } }
    }
    await sleep(1500 * (attempt + 1));
  }
  return null;
}

interface Proposal { roman: string; native: string; meaning: string; origin: string; confident: boolean }

const SPELL_SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          roman: { type: "string" },
          native: { type: "string" },
          meaning: { type: "string" },
          origin: { type: "string" },
          confident: { type: "boolean" },
        },
        required: ["roman", "native", "meaning", "origin", "confident"],
      },
    },
  },
  required: ["entries"],
};

async function propose(names: string[]): Promise<Proposal[]> {
  const out = await gemini<{ entries: Proposal[] }>(
    `For each Indian given name, return:
- native: the conventional Devanagari spelling as written in Hindi, the form that would be a dictionary or Wikipedia headword, with correct vowel length (मात्रा). Do NOT transliterate letter by letter: "Aakash" is आकाश not आकश; "Shivani" is शिवानी not शिवनि; "Raja" is राजा not रजा. If the name is Persian, Arabic or Urdu in origin and not normally written in Devanagari, still give the usual Devanagari spelling used in India.
- meaning: the meaning the name actually carries for an Indian family, as one short clause. Empty string if it carries none beyond being a name.
- origin: the language the meaning comes from.
- confident: false if you are unsure of the standard spelling or the meaning.
Never invent a meaning to fill the field.
Names: ${names.join(", ")}`,
    SPELL_SCHEMA,
    "corpus-spelling",
  );
  return out?.entries ?? [];
}

async function wiktionary(native: string): Promise<{ meaning: string; origin: string; url: string } | null> {
  if (!native) return null;
  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(native)}`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<
      string,
      Array<{ language?: string; partOfSpeech?: string; definitions?: Array<{ definition?: string }> }>
    >;

    const candidates: Array<{ meaning: string; origin: string }> = [];
    for (const secs of Object.values(data)) {
      for (const sec of secs) {
        if (!GLOSS_LANGS.has(sec.language ?? "")) continue;
        // The proper-noun sense only says "a female given name, X, from Sanskrit".
        if (/proper noun/i.test(sec.partOfSpeech ?? "")) continue;
        for (const d of sec.definitions ?? []) {
          let t = strip(d.definition ?? "");
          if (!t) continue;
          /* "Devanagari script form of rāma (“delight”)" carries the real gloss
             inside the quotes. Unwrap rather than discard a usable sense. */
          const wrapped = t.match(/\bform of\b[^(]*\(\s*[“"]([^”"]{2,120})[”"]\s*\)/);
          if (wrapped) t = wrapped[1].trim();
          if (BOILER.test(t) || NOT_A_MEANING.test(t)) continue;
          if (t.length < 3 || t.length > 160) continue;
          candidates.push({ meaning: t, origin: sec.language ?? "" });
        }
      }
    }
    if (!candidates.length) return null;

    /* Take the FIRST usable sense, not the shortest. Preferring the shortest
       was tried and measured: it cost 62 names their verification, because
       Wiktionary orders senses by primacy and the short ones are marginal.
       Laxmi went from "wealth" to "pearl", Vijay from "victory" to "a kind of
       flute". Length only breaks the tie when the primary sense is genuinely
       encyclopaedic, which पूजा's is. */
    const VERBOSE = 90;
    let best = candidates[0];
    if (best.meaning.length > VERBOSE) {
      const shorter = candidates.find((c) => c.meaning.length <= VERBOSE);
      if (shorter) best = shorter;
    }
    return { meaning: best.meaning, origin: best.origin, url: `https://en.wiktionary.org/wiki/${native}` };
  } catch {
    // Transient. Treated as a miss for this run and retried on the next.
    return null;
  }
}

const AGREE_SCHEMA = {
  type: "object",
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          roman: { type: "string" },
          agrees: { type: "boolean" },
          why: { type: "string" },
        },
        required: ["roman", "agrees", "why"],
      },
    },
  },
  required: ["checks"],
};

async function agreement(
  pairs: Array<{ roman: string; native: string; gloss: string; proposed: string }>,
) {
  const out = await gemini<{ checks: Array<{ roman: string; agrees: boolean; why: string }> }>(
    `Each line is an Indian given name, its Devanagari spelling, and the gloss Wiktionary gives for that headword.
Decide whether the gloss is the sense the NAME carries for a family who chose it.
agrees=false when the headword is a different word that merely shares the spelling, or a grammatical form, or a plant or technical sense unrelated to why the name is given.
agrees=true when the gloss is the reason the name is used.
Be strict. A wrong meaning printed with a citation is worse than no meaning.
${pairs.map((p) => `${p.roman} | ${p.native} | wiktionary: "${p.gloss}" | commonly understood as: "${p.proposed || "unknown"}"`).join("\n")}`,
    AGREE_SCHEMA,
    "corpus-agreement",
  );
  return new Map((out?.checks ?? []).map((c) => [c.roman.toLowerCase(), c]));
}

interface Result {
  slug: string; name: string; native: string; meaning: string;
  source: string; url: string; origin: string; verified: boolean; note: string;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    logger.error("GEMINI_API_KEY is not set. This script cannot run without it.");
    process.exit(1);
  }

  const rows = await db.select().from(corpusNames);
  let todo = rows.filter((r) =>
    REDO ? !r.meaning?.trim() || OURS.has(r.meaningSource ?? "") : !r.meaning?.trim(),
  );
  if (LIMIT) todo = todo.slice(0, LIMIT);

  console.log(`\n  ${rows.length} names in the corpus, ${todo.length} to process`);
  console.log(`  mode: ${WRITE ? "WRITE" : "dry run"}${REDO ? " (redo)" : ""}\n`);

  const BATCH = 20;
  const results: Result[] = [];

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const proposals = await propose(batch.map((r) => r.name));
    const byName = new Map(proposals.map((p) => [p.roman.toLowerCase(), p]));

    const looked: Array<{ row: (typeof batch)[number]; p?: Proposal; w: Awaited<ReturnType<typeof wiktionary>> }> = [];
    for (const row of batch) {
      const p = byName.get(row.name.toLowerCase());
      const w = p?.native ? await wiktionary(p.native) : null;
      looked.push({ row, p, w });
    }

    const needCheck = looked
      .filter((l) => l.w)
      .map((l) => ({ roman: l.row.name, native: l.p!.native, gloss: l.w!.meaning, proposed: l.p?.meaning ?? "" }));
    const agrees = needCheck.length ? await agreement(needCheck) : new Map();

    for (const { row, p, w } of looked) {
      const check = agrees.get(row.name.toLowerCase());
      if (w && check?.agrees) {
        results.push({
          slug: row.slug, name: row.name, native: p!.native, meaning: w.meaning,
          source: "en.wiktionary.org", url: w.url, origin: w.origin || p?.origin || "",
          verified: true, note: "wiktionary gloss, cross-checked",
        });
      } else if (p?.meaning) {
        results.push({
          slug: row.slug, name: row.name, native: p.native, meaning: p.meaning,
          source: "Gemini proposal — needs review", url: "", origin: p.origin ?? "",
          verified: false,
          note: w ? `wiktionary said "${w.meaning}", rejected: ${check?.why ?? "no cross-check"}` : "no wiktionary entry",
        });
      } else {
        results.push({
          slug: row.slug, name: row.name, native: p?.native ?? "", meaning: "",
          source: "", url: "", origin: "", verified: false, note: "nothing found",
        });
      }
    }

    const done = Math.min(i + BATCH, todo.length);
    console.log(`  ${String(done).padStart(4)}/${todo.length}   verified so far: ${results.filter((r) => r.verified).length}`);
    await sleep(1200); // free tier keys earn a 429 easily
  }

  const verified = results.filter((r) => r.verified);
  const proposed = results.filter((r) => !r.verified && r.meaning);
  const empty = results.filter((r) => !r.meaning);

  console.log(`\n  ─────────────────────────────────────`);
  console.log(`  verified from Wiktionary   ${verified.length}`);
  console.log(`  proposed, needs review     ${proposed.length}`);
  console.log(`  nothing found              ${empty.length}`);
  console.log(`  ─────────────────────────────────────`);

  if (REPORT) {
    writeFileSync(REPORT, JSON.stringify(results, null, 1), "utf8");
    console.log(`\n  full report written to ${REPORT}`);
  }

  if (!WRITE) {
    console.log(`\n  Dry run. Nothing written. Re-run with --write to apply.\n`);
    return;
  }

  let n = 0;
  for (const r of results) {
    if (!r.meaning) continue;
    await db
      .update(corpusNames)
      .set({
        meaning: r.meaning,
        meaningSource: r.source,
        meaningUrl: r.url || null,
        origin: r.origin || null,
        /* Only a corroborated spelling is stored. An unverified one displayed
           as fact is the same mistake as an unverified meaning, and the
           transliterator remains the honest fallback. */
        ...(r.verified && r.native ? { nativeSpelling: r.native } : {}),
        verified: r.verified,
        updatedAt: new Date(),
      })
      .where(eq(corpusNames.slug, r.slug));
    n++;
  }
  console.log(`\n  ${n} rows updated. Run "npm run build:names" to rebuild the pages.\n`);
}

await main();
process.exit(0);
