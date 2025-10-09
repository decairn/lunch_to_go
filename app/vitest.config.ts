import { defineConfig } from "vitest/config"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.{ts,tsx}"],
    },
  },
})
