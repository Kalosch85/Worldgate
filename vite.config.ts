import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Base path for the GitHub Pages project site (https://<user>.github.io/Worldgate/).
// GitHub Pages paths are case-sensitive and must match the repo name exactly
// ("Worldgate", not "worldgate") or every asset request 404s and the app
// never boots (a blank white page with no visible error).
// Overridable via BASE_PATH so forks / custom domains can build under a different root.
const base = process.env.BASE_PATH ?? "/Worldgate/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
