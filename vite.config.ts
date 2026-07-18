import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Base path for the GitHub Pages project site (https://<user>.github.io/worldgate/).
// Overridable via BASE_PATH so forks / custom domains can build under a different root.
const base = process.env.BASE_PATH ?? "/worldgate/";

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
