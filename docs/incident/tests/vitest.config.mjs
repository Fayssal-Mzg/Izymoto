import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

export default defineConfig({
  root,
  resolve: { alias: { "@": root } },
  test: {
    environment: "node",
    include: ["docs/incident/tests/**/*.test.mjs"],
    setupFiles: [path.join(here, "setup-env.mjs")],
    fileParallelism: false, // un seul émulateur Firestore partagé
    testTimeout: 30000,
    hookTimeout: 30000,
    server: { deps: { inline: ["next"] } },
  },
});
