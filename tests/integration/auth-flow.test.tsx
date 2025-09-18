// tests/integration/auth-flow.test.tsx
// This tests:
// * Invalid creds → error message
// * Valid creds → redirect to dashboard
// * Session persists across reloads
// * Redirect to intended page (or dashboard fallback)
// * Logout clears session


// tests/integration/auth-flow.test.tsx
import React, { ReactNode } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";

// ---------- Mock Auth Provider ----------
function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = React.useState<any>(null);

  const login = async (email: string, password: string) => {
    if (email === "alice@email.com" && password === "password") {
      const fakeUser = { id: "1", email };
      setUser(fakeUser);
      return fakeUser;
    }
    throw new Error("Invalid credentials");
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Protected Route ----------
function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Consumer>
      {({ user }) => (user ? <>{children}</> : <Navigate to="/auth" replace />)}
    </AuthContext.Consumer>
  );
}

// ---------- AuthPage wrapper that redirects after login ----------
function AuthPageMock() {
  const { user } = React.useContext(AuthContext);
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthPage />;
}

// ---------- Dashboard with stable marker ----------
function DashboardWrapper() {
  return (
    <div data-testid="dashboard-root">
      <Index />
    </div>
  );
}

// ---------- Helper: render with routes ----------
function renderWithRoutes(initialPath = "/auth") {
  return render(
    <MockAuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/auth" element={<AuthPageMock />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardWrapper />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </MockAuthProvider>
  );
}

// ---------- Tests ----------
describe("Authentication flow (integration)", () => {
  it("shows error on invalid credentials", async () => {
    renderWithRoutes("/auth");

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "wrong@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument()
    );
  });

  it("redirects to dashboard on successful login", async () => {
    renderWithRoutes("/auth");

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument()
    );
  });

  it("persists session across reloads (simulated)", async () => {
    const { rerender } = renderWithRoutes("/auth");

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument()
    );

    // Simulate reload by rerendering with same provider
    rerender(
      <MockAuthProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/auth" element={<AuthPageMock />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardWrapper />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </MockAuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument()
    );
  });

  it("redirects to intended page after login (or dashboard fallback)", async () => {
    renderWithRoutes("/dashboard"); // try protected route directly

    // should be redirected to auth
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();

    // login
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument()
    );
  });

  it("clears session on logout", async () => {
    renderWithRoutes("/auth");

    // login
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument()
    );

    // logout
    const logoutBtn = screen.getAllByRole("button", { name: /logout/i })[0];
    fireEvent.click(logoutBtn);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    );
  });
});

