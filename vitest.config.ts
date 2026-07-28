import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@mathcanvas/contracts": `${root}packages/contracts/src/index.ts`,
      "@mathcanvas/curriculum": `${root}packages/curriculum/src/index.ts`,
      "@mathcanvas/planner": `${root}packages/planner/src/index.ts`,
      "@mathcanvas/templates": `${root}packages/templates/src/index.ts`,
      "@mathcanvas/compiler": `${root}packages/mathcanvas-compiler/src/index.ts`,
      "@mathcanvas/validator": `${root}packages/validator/src/index.ts`,
      "@mathcanvas/managed-browser": `${root}packages/managed-browser/src/index.ts`
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json-summary"]
    }
  }
});
