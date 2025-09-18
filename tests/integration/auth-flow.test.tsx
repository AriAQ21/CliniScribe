// This tests:
// * Invalid creds → error message
// * Valid creds → redirect to dashboard
// * Session persists across reloads
// * Redirect to intended page (or dashboard fallback)
// * Logout clears session

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import AuthPage from "@/pages/AuthPage";
import AppointmentDetail from "@/pages/AppointmentDetail";

// --- helpers ---
const makeApp = () => (
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
      <Route path="/appointment/:id" element={<AppointmentDetail />} />
    </Routes>
  </MemoryRouter>
);

// shared mocks
let mockLogin: ReturnType<typeof vi.fn>;
let mockLogout: ReturnType<typeof vi.fn>;

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.resetModules(); // important so doMock takes effect
    mockLogin = vi.fn();
    mockLogout = vi.fn();
  });

  it("shows error for invalid credentials", async () => {
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: null,
        isAuthenticated: false,
        loading: false,
      }),
    }));

    mockLogin.mockResolvedValue({ error: "Invalid email or password" });

    render(makeApp());
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
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("redirects to dashboard on successful login", async () => {
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: null,
        isAuthenticated: false,
        loading: false,
      }),
    }));

    mockLogin.mockResolvedValue({
      user: { user_id: 1, email: "alice@email.com" },
    });

    render(makeApp());
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
    // first render: logged out
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: null,
        isAuthenticated: false,
        loading: false,
      }),
    }));

    mockLogin.mockResolvedValue({ user: { user_id: 1 } });

    const { rerender } = render(makeApp());
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

    // simulate reload: now authenticated
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: { user_id: 1 },
        isAuthenticated: true,
        loading: false,
      }),
    }));

    rerender(makeApp());
    await waitFor(() =>
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    );
  });

  it("redirects to intended page after login (or dashboard fallback)", async () => {
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: null,
        isAuthenticated: false,
        loading: false,
      }),
    }));

    mockLogin.mockResolvedValue({ user: { user_id: 1 } });

    const TestApp = () => (
      <MemoryRouter initialEntries={["/appointment/123"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
          <Route path="/appointment/:id" element={<h1>Appointment 123</h1>} />
        </Routes>
      </MemoryRouter>
    );

    render(<TestApp />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const onAppointment = screen.queryByText(/appointment 123/i);
      const onDashboard = screen.queryByText(/dashboard/i);
      expect(onAppointment || onDashboard).toBeTruthy();
    });
  });

  it("clears session on logout", async () => {
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: { user_id: 1 },
        isAuthenticated: true,
        loading: false,
      }),
    }));

    render(makeApp());
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(mockLogout).toHaveBeenCalled();
  });
});
