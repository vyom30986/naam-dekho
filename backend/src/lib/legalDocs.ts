/**
 * The five legal documents, editable from the founder console.
 *
 * Until now these lived only as static objects in
 * `frontend-jsx/src/legal/*.js`, so correcting a phone number in the privacy
 * policy meant a code change and a deploy. They now live in the `settings`
 * table alongside pricing, under the keys `legal:privacy`, `legal:terms` and
 * so on, and reuse that table's draft/published pair exactly.
 *
 * Three deliberate decisions:
 *
 * 1. **The shipped files remain the fallback.** Nothing is copied into the
 *    database by a migration. A row that does not exist simply means "no
 *    override", and the frontend keeps rendering the bundled document. An
 *    empty or unreachable database therefore changes nothing about what a
 *    visitor sees, which is the only acceptable behaviour for pages a payment
 *    processor and a regulator both require to be reachable.
 *
 * 2. **Publishing is validated with the same rules as the build.**
 *    `frontend-jsx/scripts/check-legal.cjs` blocks a build whose legal pages
 *    still say "[To be filled by the Company]" or name the wrong city. Moving
 *    the text into a database would have quietly stepped around that gate:
 *    the console could publish, to production, text the build would have
 *    refused. The same rules are enforced here, on publish.
 *
 * 3. **A draft is never public.** Legal text half-rewritten is worse than
 *    legal text that is merely out of date, because a visitor cannot tell the
 *    difference. Only `published` is ever served publicly.
 *
 * Version history comes free: every publish is written to `audit_log` with the
 * previous and new document, so which policy was in force on a given date can
 * be answered from the audit trail rather than from memory.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { settings } from "../db/schema.js";

/** The five documents, and the only slugs that will ever be accepted. */
export const LEGAL_SLUGS = [
  "privacy",
  "terms",
  "cookies",
  "cancellation-refund",
  "payment-terms",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

/** Human labels for the console, so the list does not read like URLs. */
export const LEGAL_LABELS: Record<LegalSlug, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Use",
  cookies: "Cookie Policy",
  "cancellation-refund": "Cancellation & Refund",
  "payment-terms": "Payment Terms",
};

/**
 * The document shape, matching the objects in `frontend-jsx/src/legal/*.js`
 * exactly so a stored document is a drop-in replacement for a bundled one.
 *
 * `title`, `sub` and `date` carry small inline HTML (an `<em>` in the title);
 * `html` is the body. All four are rendered as markup, so all four are
 * sanitised on the way in.
 */
export const legalDocSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(300),
  sub: z.string().max(2000).default(""),
  date: z.string().max(300).default(""),
  html: z.string().min(1).max(400_000),
});

export type LegalDoc = z.infer<typeof legalDocSchema>;

export interface LegalRow {
  published: LegalDoc | null;
  draft: LegalDoc | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

const rowKey = (slug: LegalSlug) => `legal:${slug}`;

/* ────────────────────────────────────────────────────────────────────────
 * Sanitising
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Strip anything that would execute.
 *
 * `Legal.jsx` renders these documents with `dangerouslySetInnerHTML`, which
 * was safe while the text was build-time content written by us. It stops
 * being safe the moment the console can write it: console access can be
 * delegated from the access screen, so "can edit a policy" would otherwise
 * quietly mean "can run script on every visitor's browser". That is a bigger
 * privilege than the access screen intends to hand out.
 *
 * This is a deliberately blunt denylist rather than a full HTML parser. The
 * documents use a small, known vocabulary of formatting tags, and the authors
 * are administrators rather than the public, so the job here is to remove the
 * executable surface, not to defend against a determined attacker who already
 * holds console credentials.
 */
export function sanitiseLegalHtml(input: string): string {
  return (
    input
      // whole <script> and <style> elements, including their contents
      .replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      // unclosed or malformed script/style openers
      .replace(/<\s*(script|style)\b[^>]*>/gi, "")
      // <iframe>, <object>, <embed>, <form> — no legal page needs them
      .replace(/<\s*\/?\s*(iframe|object|embed|form|input|button)\b[^>]*>/gi, "")
      // inline event handlers: onclick=, onerror=, onload= …
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
      // javascript: and data: URLs in href/src
      .replace(/(href|src)\s*=\s*"\s*(javascript|data)\s*:[^"]*"/gi, '$1="#"')
      .replace(/(href|src)\s*=\s*'\s*(javascript|data)\s*:[^']*'/gi, "$1='#'")
  );
}

function sanitiseDoc(doc: LegalDoc): LegalDoc {
  return {
    ...doc,
    title: sanitiseLegalHtml(doc.title),
    sub: sanitiseLegalHtml(doc.sub),
    date: sanitiseLegalHtml(doc.date),
    html: sanitiseLegalHtml(doc.html),
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Validation — the same rules the build gate enforces
 * ──────────────────────────────────────────────────────────────────────── */

/** Text that must never reach production. Mirrors check-legal.cjs. */
const PLACEHOLDERS: RegExp[] = [
  /\[To be filled[^\]]*\]/gi,
  /\[Registered address[^\]]*\]/gi,
  /\[CIN[^\]]*\]/gi,
  /\bTBD\b/g,
  /\bTODO\b/g,
  /\bLorem ipsum\b/gi,
];

/** Details that were wrong once and must not creep back. Mirrors check-legal.cjs. */
const FORBIDDEN: Array<[string, string]> = [
  ["Naam Dekho Technologies", "the entity is Beyond Quantum Technologies Private Limited"],
  ["Bangalore", "the registered office is in Lucknow"],
  ["@naamdekho.in", "the contact address is naamdekho.global@gmail.com"],
  ["Paytm Payment Services", "Paytm is not a payment processor for this platform"],
  ["Paytm (fallback)", "Paytm is not a payment processor for this platform"],
];

/**
 * Reasons this document cannot be published, in plain language.
 *
 * Empty array means publishable. The build gate additionally requires the
 * entity name and contact address to appear somewhere across the whole set of
 * documents; that is a property of the set, not of one document, so it is not
 * checked here — a cookie policy legitimately mentions neither.
 */
export function legalDocProblems(doc: LegalDoc): string[] {
  const problems: string[] = [];
  const text = `${doc.title}\n${doc.sub}\n${doc.date}\n${doc.html}`;

  for (const re of PLACEHOLDERS) {
    for (const hit of text.match(re) ?? []) {
      problems.push(`unfilled placeholder ${hit}`);
    }
  }
  for (const [needle, why] of FORBIDDEN) {
    if (text.includes(needle)) problems.push(`contains "${needle}" — ${why}`);
  }
  return problems;
}

/* ────────────────────────────────────────────────────────────────────────
 * Storage
 * ──────────────────────────────────────────────────────────────────────── */

function parse(value: unknown): LegalDoc | null {
  if (!value) return null;
  const parsed = legalDocSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The stored override for one document, or nulls when there is none. */
export async function getLegalRow(slug: LegalSlug): Promise<LegalRow> {
  const [row] = await db.select().from(settings).where(eq(settings.key, rowKey(slug))).limit(1);
  return {
    published: parse(row?.published),
    draft: parse(row?.draft),
    updatedAt: row?.updatedAt ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

/** Every document's stored state, for the console's list view. */
export async function getAllLegalRows(): Promise<Record<LegalSlug, LegalRow>> {
  const out = {} as Record<LegalSlug, LegalRow>;
  for (const slug of LEGAL_SLUGS) out[slug] = await getLegalRow(slug);
  return out;
}

/** The document a visitor should see, or null to fall back to the bundle. */
export async function getPublishedLegal(slug: LegalSlug): Promise<LegalDoc | null> {
  return (await getLegalRow(slug)).published;
}

export async function saveLegalDraft(
  slug: LegalSlug,
  doc: LegalDoc,
  actor: string,
): Promise<LegalDoc> {
  const clean = sanitiseDoc({ ...doc, slug });
  await db
    .insert(settings)
    .values({ key: rowKey(slug), draft: clean, updatedAt: new Date(), updatedBy: actor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { draft: clean, updatedAt: new Date(), updatedBy: actor },
    });
  return clean;
}

/**
 * Make the draft live.
 *
 * Returns null when there is no draft to publish, and throws with the reasons
 * when the draft would not survive the build gate — the caller turns both into
 * a response the console can display.
 */
export async function publishLegal(
  slug: LegalSlug,
  actor: string,
): Promise<{ before: LegalDoc | null; after: LegalDoc } | null> {
  const row = await getLegalRow(slug);
  if (!row.draft) return null;

  const problems = legalDocProblems(row.draft);
  if (problems.length > 0) {
    throw Object.assign(new Error("legal_document_not_publishable"), { problems });
  }

  await db
    .insert(settings)
    .values({
      key: rowKey(slug),
      published: row.draft,
      draft: null,
      updatedAt: new Date(),
      updatedBy: actor,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { published: row.draft, draft: null, updatedAt: new Date(), updatedBy: actor },
    });

  return { before: row.published, after: row.draft };
}

export async function discardLegalDraft(slug: LegalSlug, actor: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: rowKey(slug), draft: null, updatedAt: new Date(), updatedBy: actor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { draft: null, updatedAt: new Date(), updatedBy: actor },
    });
}

/**
 * Remove the override entirely, returning the page to the shipped document.
 *
 * The escape hatch for a published policy that turns out to be wrong: rather
 * than editing it back by hand under pressure, the console can revert to the
 * text that shipped with the build, which is known good.
 */
export async function revertLegalToBundled(
  slug: LegalSlug,
  actor: string,
): Promise<LegalDoc | null> {
  const row = await getLegalRow(slug);
  await db
    .insert(settings)
    .values({
      key: rowKey(slug),
      published: null,
      draft: null,
      updatedAt: new Date(),
      updatedBy: actor,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { published: null, draft: null, updatedAt: new Date(), updatedBy: actor },
    });
  return row.published;
}
