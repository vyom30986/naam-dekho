/**
 * The rule that decides whether a key shows red in the founder's console.
 *
 * These tests exist because the failure mode of a health indicator is not that
 * it misses an outage — it is that it cries wolf. A panel that is red most days
 * from ordinary rate limits gets ignored, and then the real outage is invisible
 * too. So the cases below are mostly about what must NOT turn red.
 */
import { describe, expect, it } from "vitest";
import { providerHealth } from "../../src/lib/api-usage.js";
import { MANAGED_KEYS } from "../../src/lib/api-keys.js";

const NOW = new Date("2026-08-22T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** A provider that is configured and has been called. */
const base = { calls: 500, failStreak: 0, failingSince: null, lastFailureAt: null, measured: true };

describe("providerHealth — what must not turn red", () => {
  it("a working key is green and carries no date", () => {
    expect(providerHealth(base, true, NOW)).toEqual({ health: "working", failingSince: null });
  });

  it("ONE rate-limited Gemini call does not turn it red", () => {
    // recordApiCall fires inside gemini.ts's three-attempt retry loop, so a
    // single 429 writes three failure rows within about two seconds. This is
    // the exact case that made a threshold of three unusable.
    const r = providerHealth(
      { ...base, failStreak: 3, failingSince: ago(2000), lastFailureAt: ago(1000) },
      true,
      NOW,
    );
    expect(r.health).toBe("working");
  });

  it("a burst of failures inside half an hour does not turn it red", () => {
    const r = providerHealth(
      { ...base, failStreak: 9, failingSince: ago(4 * MIN), lastFailureAt: ago(1 * MIN) },
      true,
      NOW,
    );
    expect(r.health).toBe("working");
  });

  it("a key that was never filled in is not red, it is missing", () => {
    expect(providerHealth(base, false, NOW).health).toBe("not_configured");
  });

  it("a database we could not read is not green", () => {
    // Zero failures and "we could not look" are different answers.
    expect(providerHealth({ ...base, measured: false }, true, NOW).health).toBe("no_data");
  });

  it("a configured key nothing has ever called is not green either", () => {
    expect(providerHealth({ ...base, calls: 0 }, true, NOW).health).toBe("no_data");
  });
});

describe("providerHealth — what must turn red", () => {
  it("a revoked key is red, with the date it started", () => {
    const since = ago(3 * DAY);
    const r = providerHealth(
      { ...base, failStreak: 240, failingSince: since, lastFailureAt: ago(2 * MIN) },
      true,
      NOW,
    );
    expect(r.health).toBe("failing");
    expect(r.failingSince).toBe(since.toISOString());
  });

  it("exhausted credits sustained past the floor are red", () => {
    const r = providerHealth(
      { ...base, failStreak: 5, failingSince: ago(31 * MIN), lastFailureAt: ago(1 * MIN) },
      true,
      NOW,
    );
    expect(r.health).toBe("failing");
  });

  it("broken, but untouched for a week, is amber rather than an alarm", () => {
    const since = ago(20 * DAY);
    const r = providerHealth(
      { ...base, failStreak: 40, failingSince: since, lastFailureAt: ago(9 * DAY) },
      true,
      NOW,
    );
    expect(r.health).toBe("was_failing");
    expect(r.failingSince).toBe(since.toISOString());
  });
});

describe("providerHealth — clearing", () => {
  it("one success clears it, with no state to reset", () => {
    // The query defines failingSince relative to the last success, so after a
    // key starts working the streak is empty on the very next read. This is the
    // reason the health is derived rather than stored: nothing can get stuck.
    const stuck = { ...base, failStreak: 99, failingSince: ago(5 * DAY), lastFailureAt: ago(1 * MIN) };
    expect(providerHealth(stuck, true, NOW).health).toBe("failing");

    const afterSuccess = { ...stuck, failStreak: 0, failingSince: null };
    expect(providerHealth(afterSuccess, true, NOW)).toEqual({ health: "working", failingSince: null });
  });
});

describe("the key list", () => {
  it("every managed key is classified free or paid", () => {
    // Without this, a key added later drops out of BOTH sections of the console
    // and nobody notices it is unlisted.
    for (const k of MANAGED_KEYS) {
      expect(["free", "paid"], `${k.env} has no tier`).toContain(k.tier);
    }
  });

  it("classifies the ones that can produce a bill as paid", () => {
    const tier = (env: string) => MANAGED_KEYS.find((k) => k.env === env)?.tier;
    // Metered or prepaid — these can invoice.
    expect(tier("SCRAPING_BEE_API_KEY")).toBe("paid");
    expect(tier("TWO_CAPTCHA_KEY")).toBe("paid");
    expect(tier("GOOGLE_CSE_API_KEY")).toBe("paid"); // free 100/day, then billed
    expect(tier("R2_SECRET_ACCESS_KEY")).toBe("paid");
    // Free tiers and free platforms.
    expect(tier("GEMINI_API_KEY")).toBe("free");
    expect(tier("BHASHINI_ULCA_API_KEY")).toBe("free");
    expect(tier("GITHUB_TOKEN")).toBe("free");
  });
});
