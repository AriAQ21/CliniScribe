// tests/integration/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

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

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Makes it obvious if a test forgot to mock its requests
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn(() =>
    Promise.reject(new Error("fetch not mocked — please mock in your test"))
  ) as any;
}
