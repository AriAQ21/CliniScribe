/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts", // 👈 points to your root-level tests folder
    alias: {
      "@": path.resolve(__dirname, "frontend/src"), // still maps @ → frontend/src
    },
  },
});
