import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
      },
    },
  },
});
