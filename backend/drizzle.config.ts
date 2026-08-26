import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    /*
     * No fallback URL on purpose.
     *
     * This used to default to a hardcoded localhost connection string,
     * credential and all. Two problems with that. It put a password in a file
     * that gets committed, and, worse, a missing DATABASE_URL would silently
     * connect somewhere plausible instead of saying so, which is how a
     * migration ends up applied to the wrong database.
     */
    url: (() => {
      const url = process.env.DATABASE_URL?.trim();
      if (!url) {
        throw new Error(
          "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.",
        );
      }
      return url;
    })(),
  },
} satisfies Config;
