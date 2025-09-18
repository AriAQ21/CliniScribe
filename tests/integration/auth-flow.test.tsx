import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index";

// 🔹 Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// 🔹 Mock supabase auth methods
vi.mock("@/integrations/supabase/client", () => {
  const mockSignInWithPassword = vi.fn();
  const mockSignOut = vi.fn();

  return {
    supabase: {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
      },
    },
    __mocks: { mockSignInWithPassword, mockSignOut },
  };
});

describe("Authentication flow (integration)", () => {
  let mockSignInWithPassword: ReturnType<typeof vi.fn>;
  let mockSignOut: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // Grab fresh mocks every test run
    const { __mocks } = await import("@/integrations/supabase/client");
    mockSignInWithPassword = __mocks.mockSignInWithPassword;
    mockSignOut = __mocks.mockSignOut;
  });

  it("logs in successfully and navigates to dashboard", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 1, email: "alice@email.com" },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("logs out successfully and navigates to auth page", async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/auth")
    );
  });
});
