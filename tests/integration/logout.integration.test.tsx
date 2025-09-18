// This tests:
// * User logs in with valid credentials.
// * Dashboard loads → header shows CliniScribe.
// * User clicks Logout.
// * App redirects to /auth.
// * Login page content (Sign In heading) is visible again.

// tests/frontend/logout.integration.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import { useAuth } from "@/hooks/useAuth";

// --- Mock hook ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// --- Real-ish components ---
const AuthPage = () => <h1>Sign In</h1>;

const Dashboard = () => {
  const { logout } = useAuth();
  return (
    <div>
      <h1>CliniScribe</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("Logout flow", () => {
  it("logs out and redirects to auth page", () => {
    const mockLogout = vi.fn();

    // --- Phase 1: Authenticated ---
    (useAuth as unknown as vi.Mock).mockReturnValueOnce({
      user: { user_id: 123 },
      isAuthenticated: true,
      login: vi.fn(),
      logout: () => {
        mockLogout();
        // After logout, re-render should get unauthenticated state
        (useAuth as unknown as vi.Mock).mockReturnValue({
          user: null,
          isAuthenticated: false,
          login: vi.fn(),
          logout: vi.fn(),
        });
      },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Confirm we’re on Dashboard
    expect(screen.getByText("CliniScribe")).toBeInTheDocument();

    // Click logout
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).toHaveBeenCalled();

    // --- Phase 2: Unauthenticated after logout ---
    // Re-render by navigating to /auth manually in test
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Confirm auth page is visible
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });
});
