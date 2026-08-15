import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": new URL("./vitest.server-only-stub.js", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/schemas/**/*.ts", "src/lib/proxy.ts"],
      exclude: ["src/generated/**", "src/**/*.test.ts"],
    },
  },
});