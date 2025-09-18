// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard"; // <- whatever page user sees after login
import { vi, describe, it, beforeEach, expect } from "vitest";

// --- Mock backend fetch calls ---
beforeEach(() => {
  vi.resetAllMocks();

  global.fetch = vi.fn((url, options) => {
    if (url.includes("/login")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          user: { id: 1, email: "alice@email.com" },
          token: "fake-jwt",
        }),
      }) as any;
    }

    if (url.includes("/logout")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      }) as any;
    }

    return Promise.reject(new Error("Unhandled fetch: " + url));
  }) as any;
});

describe("Authentication flow (integration)", () => {
  it("logs in successfully and shows dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Fill out form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Wait until dashboard appears
    expect(
      await screen.findByText(/welcome|dashboard/i)
    ).toBeInTheDocument();

    // Sanity check: backend called with right args
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/login$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "alice@email.com",
          password: "password",
        }),
      })
    );
  });

  it("logs out successfully", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<button>Logout</button>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/logout/i));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/logout$/),
        expect.objectContaining({ method: "POST" })
      )
    );
  });
});
