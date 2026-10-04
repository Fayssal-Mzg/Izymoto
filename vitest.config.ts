import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Les suites partagent la même instance d'émulateur : exécution séquentielle.
    fileParallelism: false,
  },
});
