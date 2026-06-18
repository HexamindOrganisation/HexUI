import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli/index.ts"),
        llm: resolve(__dirname, "src/llm/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, name) =>
        `${name}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "yaml",
        "zod",
        "zod-to-json-schema",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        // Heavy, optional-by-feature deps — kept external so the lib stays lean
        // and the consumer's bundler code-splits/tree-shakes them (used only by
        // the markdown renderer's math + code highlighting).
        "katex",
        "lowlight",
        "node:fs",
        "node:path",
        "node:process",
      ],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
