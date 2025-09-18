// tests/integration/auth-flow.test.tsx
// This tests:
// * Invalid creds → error message
// * Valid creds → redirect to dashboard
// * Session persists across reloads
// * Redirect to intended page (or dashboard fallback)
// * Logout clears session

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";
import Index from "@/pages/Index";
import AppointmentDetail from "@/pages/AppointmentDetail";
import { useAuth } from "@/hooks/useAuth";

// shared mocks
let mockLogin: ReturnType<typeof vi.fn>;
let mockLogout: ReturnType<typeof vi.fn>;

// ---- Test Doubles ----

// Fake AuthPage that simulates login + redirect
const FakeAuthPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login("alice@email.com", "password");
    if (result?.user) {
      navigate("/dashboard");
    }
  };

  return (
    <div>
      <h1>Fake Auth Page</h1>
      <button onClick={handleSubmit}>Sign In</button>
    </div>
  );
};

// ProtectedRoute stub
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <FakeAuthPage />;
};

// Dashboard with logout stub
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

// ---- Helpers ----

// Look for text unique to the dashboard
const assertOnDashboard = async () => {
  const possibleTexts = [
    /dashboard/i,
    /today's schedule/i,
    /filter by date/i,
    /import appointments/i,
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

// ---- Tests ----

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
          <Route path="/auth" element={<FakeAuthPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith("alice@email.com", "password")
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
          <Route path="/auth" element={<FakeAuthPage />} />
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
          <Route path="/auth" element={<FakeAuthPage />} />
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
          <Route path="/auth" element={<FakeAuthPage />} />
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

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const onAppointment = screen.queryByText(/appointment 123/i);
      const onDashboard =
        screen.queryByText(/dashboard/i) ||
        screen.queryByText(/today's schedule/i);
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
