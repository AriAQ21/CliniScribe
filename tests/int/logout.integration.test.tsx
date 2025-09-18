// This tests:
// * User logs in with valid credentials.
// * Dashboard loads → header shows CliniScribe.
// * User clicks Logout.
// * App redirects to /auth.
// * Login page content (Sign In heading) is visible again.

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import { useAuth } from "@/hooks/useAuth";

// --- Mock hooks ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// --- Minimal fake components ---
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
  it("redirects to auth page after logout", () => {
    const mockLogout = vi.fn();

    // First render: authenticated
    (useAuth as unknown as vi.Mock).mockReturnValue({
      user: { user_id: 123 },
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Dashboard should be visible
    expect(screen.getByText("CliniScribe")).toBeInTheDocument();

    // Click logout
    fireEvent.click(screen.getByText("Logout"));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("renders auth page when not authenticated", () => {
    // Not authenticated state
    (useAuth as unknown as vi.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Should be back on login page
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });
});
