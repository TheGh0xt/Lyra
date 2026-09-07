import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * The default environment stays `node` — the SSE tests exercise streams and
 * gain nothing from a DOM. Component tests opt in per file with a
 * `// @vitest-environment jsdom` docblock, which keeps the fast tests fast.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
