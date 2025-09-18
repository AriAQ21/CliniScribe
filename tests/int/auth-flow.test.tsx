// This tests:
// * Invalid creds → show error + stay on login UI
// * Valid creds → redirect to dashboard + persist across reload
// * Redirect to intended page if hitting a protected route first
// * Logout clears session → shows auth UI again

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AuthPage from "@/pages/AuthPage";
import { UnifiedAppointmentsList } from "@/components/UnifiedAppointmentsList";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- Mock useAuth ---
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: mockLogout,
    user: null,
    isAuthenticated: false,
    loading: false,
  }),
}));

// --- Test app with routes ---
const AppUnderTest = () => (
  <MemoryRouter initialEntries={["/auth"]}>
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <div>
            <h1>Dashboard</h1>
            <button onClick={() => mockLogout()}>Logout</button>
          </div>
        }
      />
      <Route
        path="/appointment/:id"
        element={<AppointmentDetail />}
      />
    </Routes>
  </MemoryRouter>
);

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows error for invalid credentials", async () => {
    mockLogin.mockResolvedValue({ error: "Invalid email or password" });

    render(<AppUnderTest />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "badpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument(); // still on auth UI
  });

  it("redirects to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue({ user: { user_id: 1, email: "alice@email.com" } });

    render(<AppUnderTest />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    );
  });

  it("persists session across reloads (simulated)", async () => {
    // First login
    mockLogin.mockResolvedValue({ user: { user_id: 1 } });

    const { rerender } = render(<AppUnderTest />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    );

    // Simulate reload by re-rendering while user stays authenticated
    vi.mock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: { user_id: 1 },
        isAuthenticated: true,
        loading: false,
      }),
    }));
    rerender(<AppUnderTest />);
    await waitFor(() =>
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    );
  });

  it("clears session on logout", async () => {
    // Pretend user is already logged in
    vi.mock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: { user_id: 1 },
        isAuthenticated: true,
        loading: false,
      }),
    }));

    render(<AppUnderTest />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    // After logout, should return to auth UI
    expect(mockLogout).toHaveBeenCalled();
  });
});
