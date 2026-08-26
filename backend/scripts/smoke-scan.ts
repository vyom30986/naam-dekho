/**
 * Smoke test — runs a real free-tier business scan directly through the
 * orchestrator (no HTTP server, no Postgres needed; Redis optional thanks
 * to the dev in-memory cache fallback).
 *
 *   npx tsx scripts/smoke-scan.ts <name>
 */
import { runScan } from "../src/scanners/index.js";

const name = process.argv[2] ?? "Vyana";

console.log(`\n— Naam Dekho smoke scan: "${name}" (business, free tier) —\n`);
const started = Date.now();

const { tiles, verdict } = await runScan(
  { scanId: "smoke", name, mode: "business", tier: "free" },
  (tile) => {
    const icon =
      tile.status === "ok" ? "✅" :
      tile.status === "no" ? "❌" :
      tile.status === "warn" ? "⚠️ " :
      tile.status === "info" ? "ℹ️ " : "⏳";
    console.log(`${icon}  [${tile.tileId.padEnd(9)}] ${tile.summary}  (${tile.latencyMs ?? "-"} ms, ${tile.source ?? ""})`);
  },
);

console.log(`\nTiles: ${tiles.length}  |  Score: ${verdict.score}/100  |  ${verdict.summary}`);
console.log(`clear=${verdict.clear} conflict=${verdict.conflict} warn=${verdict.warn} info=${verdict.info} pending=${verdict.pending}`);
console.log(`Total time: ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
process.exit(0);
