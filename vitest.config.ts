import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,        // so you can use "vi", "describe", etc.
    environment: "jsdom", // simulate browser for React components
    setupFiles: "./tests/setup.ts", // optional, for shared mocks
  },
});
