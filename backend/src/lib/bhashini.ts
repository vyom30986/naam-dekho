import fetch from "node-fetch";
import { logger } from "../logger.js";

/**
 * Bhashini (bhashini.gov.in) — Government of India national language platform.
 * Used to transliterate a name into the major Indian scripts, so parents and
 * founders can see exactly how it will be written across the country.
 *
 * Two-step protocol (per the official ULCA/Dhruva docs):
 *
 *   1. Pipeline CONFIG call  → https://meity-auth.ulcacontrib.org
 *      Discovers which service handles a language pair.
 *      Anonymous config (service discovery) is OPEN — no credentials.
 *      Adding userID + ulcaApiKey headers additionally returns the
 *      inference endpoint and a short-lived inference key.
 *
 *   2. Pipeline COMPUTE call → https://dhruva-api.bhashini.gov.in
 *      Runs the actual transliteration. ALWAYS requires authentication —
 *      it returns {"detail":"Not authenticated"} / HTTP 403 without a key.
 *      (Verified live, 3 Aug 2026.)
 *
 * Credentials come from a free registration at
 * https://bhashini.gov.in/ulca/user/register — see GO_LIVE_CHECKLIST.md.
 * Until they are set, `isConfigured()` is false and every caller falls back
 * to the in-house transliteration engine. We never fabricate a Bhashini
 * result and never claim Bhashini as the source unless it really answered.
 */

const ULCA_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
// MeitY's public pipeline — overridable if Bhashini assigns a dedicated one.
const DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd";
const TRANSLITERATION_SERVICE_FALLBACK = "ai4bharat/indicxlit--cpu-fsv2";

/** The 10 Indian languages shown on the meaning tile (ISO-639-1). */
export const TARGET_LANGUAGES: Array<{ code: string; name: string; script: string }> = [
  { code: "hi", name: "Hindi", script: "Devanagari" },
  { code: "bn", name: "Bengali", script: "Bengali" },
  { code: "ta", name: "Tamil", script: "Tamil" },
  { code: "te", name: "Telugu", script: "Telugu" },
  { code: "mr", name: "Marathi", script: "Devanagari" },
  { code: "gu", name: "Gujarati", script: "Gujarati" },
  { code: "kn", name: "Kannada", script: "Kannada" },
  { code: "ml", name: "Malayalam", script: "Malayalam" },
  { code: "pa", name: "Punjabi", script: "Gurmukhi" },
  { code: "or", name: "Odia", script: "Odia" },
];

const userId = () => process.env.BHASHINI_USER_ID?.trim() ?? "";
// BHASHINI_API_KEY is the historical name for the ULCA key — still honoured.
const ulcaKey = () =>
  (process.env.BHASHINI_ULCA_API_KEY ?? process.env.BHASHINI_API_KEY ?? "").trim();
const pipelineId = () => process.env.BHASHINI_PIPELINE_ID?.trim() || DEFAULT_PIPELINE_ID;
/** Optional — some accounts are issued a standalone inference key. */
const directInferenceKey = () => process.env.BHASHINI_INFERENCE_KEY?.trim() ?? "";

/** True only when we hold enough credentials to actually reach Dhruva. */
export function isConfigured(): boolean {
  return Boolean(userId() && ulcaKey()) || Boolean(directInferenceKey());
}

interface ConfigServiceEntry {
  serviceId: string;
  language: { sourceLanguage: string; targetLanguage?: string };
}
interface ConfigResponse {
  pipelineResponseConfig?: Array<{ taskType: string; config: ConfigServiceEntry[] }>;
  pipelineInferenceAPIEndPoint?: {
    callbackUrl: string;
    inferenceApiKey: { name: string; value: string };
  };
}

interface ResolvedPipeline {
  callbackUrl: string;
  headerName: string;
  headerValue: string;
  serviceFor: Map<string, string>; // target lang code → serviceId
}

let cached: { at: number; value: ResolvedPipeline } | null = null;
let inFlight: Promise<ResolvedPipeline | null> | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // the inference key is short-lived; re-fetch every 30 min

/**
 * Authenticated config call — resolves the inference endpoint, the auth
 * header to use, and the serviceId for each target language.
 */
async function resolvePipeline(): Promise<ResolvedPipeline | null> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(ULCA_CONFIG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          userID: userId(),
          ulcaApiKey: ulcaKey(),
        },
        body: JSON.stringify({
          pipelineTasks: [{ taskType: "transliteration" }],
          pipelineRequestConfig: { pipelineId: pipelineId() },
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, "Bhashini config call rejected — check BHASHINI_USER_ID / BHASHINI_ULCA_API_KEY");
        return null;
      }

      const body = (await res.json()) as ConfigResponse;
      const endpoint = body.pipelineInferenceAPIEndPoint;
      const direct = directInferenceKey();

      // Without the endpoint block we have no inference key and cannot compute.
      if (!endpoint && !direct) {
        logger.warn("Bhashini config returned no inference endpoint — credentials are likely unauthenticated");
        return null;
      }

      const serviceFor = new Map<string, string>();
      const entries = body.pipelineResponseConfig?.find((c) => c.taskType === "transliteration")?.config ?? [];
      for (const e of entries) {
        if (e.language.sourceLanguage !== "en" || !e.language.targetLanguage) continue;
        if (!serviceFor.has(e.language.targetLanguage)) {
          serviceFor.set(e.language.targetLanguage, e.serviceId);
        }
      }

      const value: ResolvedPipeline = {
        callbackUrl: endpoint?.callbackUrl ?? "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
        headerName: endpoint?.inferenceApiKey?.name ?? "Authorization",
        headerValue: direct || endpoint?.inferenceApiKey?.value || "",
        serviceFor,
      };
      cached = { at: Date.now(), value };
      return value;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "Bhashini config call failed");
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

interface ComputeResponse {
  pipelineResponse?: Array<{
    taskType: string;
    output?: Array<{ source: string; target: string }>;
  }>;
}

/**
 * Transliterate `name` from English into every language in TARGET_LANGUAGES.
 * Returns null when Bhashini is not configured or the call fails — callers
 * must fall back to the in-house engine rather than showing a gap.
 */
export async function transliterateAll(
  name: string,
): Promise<Array<{ code: string; name: string; script: string; text: string }> | null> {
  if (!isConfigured()) return null;

  const pipeline = await resolvePipeline();
  if (!pipeline || !pipeline.headerValue) return null;

  const results = await Promise.all(
    TARGET_LANGUAGES.map(async (lang) => {
      const serviceId = pipeline.serviceFor.get(lang.code) ?? TRANSLITERATION_SERVICE_FALLBACK;
      try {
        const res = await fetch(pipeline.callbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [pipeline.headerName]: pipeline.headerValue,
          },
          body: JSON.stringify({
            pipelineTasks: [
              {
                taskType: "transliteration",
                config: {
                  language: { sourceLanguage: "en", targetLanguage: lang.code },
                  serviceId,
                  isSentence: false,
                  numSuggestions: 1,
                },
              },
            ],
            inputData: { input: [{ source: name }] },
          }),
          signal: AbortSignal.timeout(8_000),
        });
        if (!res.ok) return null;
        const body = (await res.json()) as ComputeResponse;
        const target = body.pipelineResponse?.[0]?.output?.[0]?.target?.trim();
        return target ? { ...lang, text: target } : null;
      } catch {
        return null; // one language failing must not sink the rest
      }
    }),
  );

  const ok = results.filter((r): r is { code: string; name: string; script: string; text: string } => r !== null);
  return ok.length > 0 ? ok : null;
}

/**
 * Service discovery only — needs NO credentials. Used by the readiness probe
 * to prove the Bhashini platform is reachable and which languages it covers.
 */
export async function probeAvailableLanguages(): Promise<string[] | null> {
  try {
    const res = await fetch(ULCA_CONFIG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: "transliteration" }],
        pipelineRequestConfig: { pipelineId: pipelineId() },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ConfigResponse;
    const entries = body.pipelineResponseConfig?.find((c) => c.taskType === "transliteration")?.config ?? [];
    const targets = new Set<string>();
    for (const e of entries) {
      if (e.language.sourceLanguage === "en" && e.language.targetLanguage) {
        targets.add(e.language.targetLanguage);
      }
    }
    return [...targets].sort();
  } catch {
    return null;
  }
}
