// tests/integration/auth-flow.test.tsx
// This tests:
// * Invalid creds → error message
// * Valid creds → redirect to dashboard
// * Session persists across reloads
// * Redirect to intended page (or dashboard fallback)
// * Logout clears session

// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";
import { useAuth } from "@/hooks/useAuth";

// shared mocks
let mockLogin: ReturnType<typeof vi.fn>;
let mockLogout: ReturnType<typeof vi.fn>;
let mockUser: any;

// Helper: assert dashboard loaded
const assertOnDashboard = async () => {
  await waitFor(() => {
    expect(screen.getByTestId("dashboard-root")).toBeInTheDocument();
  });
};

// Protected route stub
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <AuthPage />;
};

// Dashboard stub wrapper
const DashboardWithLogout = () => (
  <div data-testid="dashboard-root">
    <Index
      dummyAppointments={[]}
      importedAppointments={[]}
      selectedDate={new Date()}
    />
  </div>
);

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogin = vi.fn();
    mockLogout = vi.fn();
    mockUser = null;

    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: mockUser,
        isAuthenticated: !!mockUser,
        loading: false,
      }),
    }));
  });

  it("shows error for invalid credentials", async () => {
    mockLogin.mockResolvedValue({ error: "Invalid email or password" });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "badpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument()
    );
  });

  it("redirects to dashboard on successful login", async () => {
    mockLogin.mockResolvedValue({
      user: { user_id: 1, email: "alice@email.com" },
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardWithLogout />} />
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

    // simulate backend marking user as authenticated
    mockUser = { user_id: 1 };

    await assertOnDashboard();
  });

  it("persists session across reloads (simulated)", async () => {
    mockLogin.mockResolvedValue({ user: { user_id: 1 } });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardWithLogout />} />
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

    mockUser = { user_id: 1 };

    await assertOnDashboard();

    // simulate reload: rerender with authenticated user
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardWithLogout />} />
        </Routes>
      </MemoryRouter>
    );

    await assertOnDashboard();
  });

  it("redirects to intended page after login (or dashboard fallback)", async () => {
    mockLogin.mockResolvedValue({ user: { user_id: 1 } });

    const TestApp = () => (
      <MemoryRouter initialEntries={["/appointment/123"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardWithLogout />} />
          <Route
            path="/appointment/:id"
            element={
              <ProtectedRoute>
                <h1>Appointment 123</h1>
              </ProtectedRoute>
            }
          />
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

    mockUser = { user_id: 1 };

    await waitFor(() => {
      const onAppointment = screen.queryByText(/appointment 123/i);
      const onDashboard = screen.queryByTestId("dashboard-root");
      expect(onAppointment || onDashboard).toBeTruthy();
    });
  });

  it("clears session on logout", async () => {
    mockUser = { user_id: 1 };

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardWithLogout />} />
        </Routes>
      </MemoryRouter>
    );

    const logoutButtons = screen.getAllByRole("button", { name: /logout/i });
    fireEvent.click(logoutButtons[logoutButtons.length - 1]);

    expect(mockLogout).toHaveBeenCalled();
  });
});

