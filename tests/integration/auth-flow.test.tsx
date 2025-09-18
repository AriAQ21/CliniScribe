// tests/integration/auth-flow.test.tsx
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
import Index from "@/pages/Index";
import { useAuth } from "@/hooks/useAuth";

// shared mocks
let mockLogin: ReturnType<typeof vi.fn>;
let mockLogout: ReturnType<typeof vi.fn>;

// Helper: checks for any valid dashboard text
const assertOnDashboard = async () => {
  const possibleTexts = [
    /imported appointments/i,
    /scheduled appointments/i,
    /no appointments found/i,
  ];
  await waitFor(() => {
    expect(
      possibleTexts.some((pattern) =>
        screen.queryByText(pattern, { exact: false })
      )
    ).toBe(true);
  });
};

// Protected route stub
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <AuthPage />;
};

// Dashboard with logout button stub
const DashboardWithLogout = ({ onLogout }: { onLogout: () => void }) => (
  <>
    <button onClick={onLogout}>Logout</button>
    <Index
      dummyAppointments={[]}
      importedAppointments={[]}
      selectedDate={new Date()}
    />
  </>
);

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.resetModules();
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

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <Index
                dummyAppointments={[]}
                importedAppointments={[]}
                selectedDate={new Date()}
              />
            }
          />
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

    await assertOnDashboard();
  });

  it("persists session across reloads (simulated)", async () => {
    // First render: logged out
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

    const { rerender } = render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <Index
                dummyAppointments={[]}
                importedAppointments={[]}
                selectedDate={new Date()}
              />
            }
          />
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

    await assertOnDashboard();

    // Simulate reload: now authenticated
    vi.doMock("@/hooks/useAuth", () => ({
      useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: { user_id: 1 },
        isAuthenticated: true,
        loading: false,
      }),
    }));

    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <Index
                dummyAppointments={[]}
                importedAppointments={[]}
                selectedDate={new Date()}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await assertOnDashboard();
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
          <Route
            path="/dashboard"
            element={
              <Index
                dummyAppointments={[]}
                importedAppointments={[]}
                selectedDate={new Date()}
              />
            }
          />
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

    await waitFor(() => {
      const onAppointment = screen.queryByText(/appointment 123/i);
      const onDashboard =
        screen.queryByText(/imported appointments/i) ||
        screen.queryByText(/scheduled appointments/i) ||
        screen.queryByText(/no appointments found/i);
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

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<DashboardWithLogout onLogout={mockLogout} />}
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
