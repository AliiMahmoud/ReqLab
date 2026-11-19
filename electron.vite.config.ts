import { resolve } from "node:path";
import { defineConfig } from "electron-vite";

const sharedAlias = { "@shared": resolve("src/shared") };

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: { input: resolve("src/main/index.ts") },
    },
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        input: resolve("src/preload/index.ts"),
        // Sandboxed preload scripts must be CommonJS.
        output: { format: "cjs", entryFileNames: "[name].cjs" },
      },
    },
  },
  renderer: {
    root: resolve("src/renderer"),
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: { input: resolve("src/renderer/index.html") },
      // No source maps in the shipped app.
      sourcemap: false,
      // Smaller bundle, faster cold start (CodeMirror is large as readable source).
      minify: true,
      // Chromium supports modulepreload natively; the polyfill would need inline script (blocked by CSP).
      modulePreload: { polyfill: false },
    },
  },
});
