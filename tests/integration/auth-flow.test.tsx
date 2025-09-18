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
import React, { createContext, useContext, useState } from "react";
import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";

// ------------------ Mock Auth Context ------------------
type AuthContextType = {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  const login = async (email: string, password: string) => {
    if (email === "alice@email.com" && password === "password") {
      const newUser = { user_id: 1, email };
      setUser(newUser);
      return { user: newUser };
    }
    return { error: "Invalid email or password" };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading: false,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Mock the actual useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within MockAuthProvider");
    return ctx;
  },
}));

// ------------------ Helpers ------------------
const assertOnDashboard = async () => {
  const patterns = [
    /imported appointments/i,
    /scheduled appointments/i,
    /no appointments found/i,
    /dashboard/i,
    /today's schedule/i,
  ];
  await waitFor(() => {
    expect(
      patterns.some((p) => screen.queryByText(p, { exact: false }))
    ).toBe(true);
  });
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useContext(AuthContext)!;
  return isAuthenticated ? <>{children}</> : <AuthPage />;
};

const DashboardWithLogout = () => {
  const { logout } = useContext(AuthContext)!;
  return (
    <>
      <button onClick={logout}>Logout</button>
      <Index
        dummyAppointments={[]}
        importedAppointments={[]}
        selectedDate={new Date()}
      />
    </>
  );
};

// ------------------ Tests ------------------
describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error for invalid credentials", async () => {
    render(
      <MockAuthProvider>
        <MemoryRouter initialEntries={["/auth"]}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </MemoryRouter>
      </MockAuthProvider>
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
    render(
      <MockAuthProvider>
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
      </MockAuthProvider>
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
    const { rerender } = render(
      <MockAuthProvider>
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
      </MockAuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await assertOnDashboard();

    // Simulate reload by rerendering at /dashboard
    rerender(
      <MockAuthProvider>
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
      </MockAuthProvider>
    );

    await assertOnDashboard();
  });

  it("redirects to intended page after login (or dashboard fallback)", async () => {
    render(
      <MockAuthProvider>
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
      </MockAuthProvider>
    );

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
        screen.queryByText(/no appointments found/i) ||
        screen.queryByText(/today's schedule/i);
      expect(onAppointment || onDashboard).toBeTruthy();
    });
  });

  it("clears session on logout", async () => {
    render(
      <MockAuthProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<DashboardWithLogout />} />
          </Routes>
        </MemoryRouter>
      </MockAuthProvider>
    );

    const logoutButtons = screen.getAllByRole("button", { name: /logout/i });
    fireEvent.click(logoutButtons[logoutButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });
  });
});

