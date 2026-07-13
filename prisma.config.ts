import { resolve } from "node:path";
import { config as loadEnvironmentFile } from "dotenv";
import { defineConfig } from "prisma/config";

const supportedEnvironmentFiles = new Set([".env", ".env.production"]);
const explicitEnvironmentFile = process.env.PRISMA_ENV_FILE?.trim();
const environmentFile = explicitEnvironmentFile || ".env";

if (!supportedEnvironmentFiles.has(environmentFile)) {
  throw new Error(
    `Unsupported Prisma environment file: ${environmentFile}.`,
  );
}

if (explicitEnvironmentFile) {
  delete process.env.DATABASE_URL;
}

const environmentResult = loadEnvironmentFile({
  override: Boolean(explicitEnvironmentFile),
  path: resolve(process.cwd(), environmentFile),
  quiet: true,
});

if (explicitEnvironmentFile && environmentResult.error) {
  throw new Error(`Unable to load Prisma environment file: ${environmentFile}.`);
}

if (explicitEnvironmentFile && !process.env.DATABASE_URL?.trim()) {
  throw new Error(`DATABASE_URL is missing from ${environmentFile}.`);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
