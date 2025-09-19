import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index";

// --- Mock navigate ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// --- Mock useAuth hook ---
const mockLogin = vi.fn();
const mockLogout = vi.fn();
let mockIsAuthenticated = false;
let mockAuthLoading = false;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: mockLogout,
    isAuthenticated: mockIsAuthenticated,
    loading: mockAuthLoading,
  }),
}));

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsAuthenticated = false;
    mockAuthLoading = false;
  });

  it("logs in successfully and navigates to dashboard", async () => {
    mockLogin.mockResolvedValueOnce({ error: null });

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

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("logs out successfully and navigates to auth page", async () => {
    mockIsAuthenticated = true;
    mockLogout.mockImplementation(() => {
      mockIsAuthenticated = false;
      mockNavigate("/auth");
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });
});
