// tests/integration/setup.ts
import "@testing-library/jest-dom";
// Ensure a clean DOM + storage before each test
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetAllMocks();
});

// Provide missing browser APIs if needed
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = require("util").TextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = require("util").TextDecoder;
}

// Mock fetch by default so tests fail if they forget to mock
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn(() =>
    Promise.reject(new Error("fetch not mocked"))
  ) as any;
}
