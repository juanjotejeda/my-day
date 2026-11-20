import { defineConfig } from "prisma/config";

// Local dev keeps DATABASE_URL in .env.local (Next.js reads it too).
// On Railway the variable is set in the environment, so a missing file is fine.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local: production
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
