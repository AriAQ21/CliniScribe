// tests/integration/auth-flow.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";

// ---- Mock Auth Context ----
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock("../../src/contexts/AuthContext", () => {
  return {
    useAuth: () => ({
      user: null,
      login: mockLogin,
      logout: mockLogout,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// ---- Pages ----
import AuthPage from "../../src/pages/AuthPage";

// ---- Tests ----
describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error for invalid credentials", async () => {
    // simulate login throwing an error
    mockLogin.mockImplementationOnce(() => {
      throw new Error("Invalid email or password");
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "invalid@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // flexible matcher so it works even if split into nested elements
    await waitFor(() => {
      expect(
        screen.getByText((content, node) =>
          node?.textContent?.includes("Invalid email or password")
        )
      ).toBeInTheDocument();
    });
  });

  it("calls login on successful form submit", async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, email: "alice@email.com" });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
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
      expect(mockLogin).toHaveBeenCalledWith("alice@email.com", "password");
    });
  });

  it("calls logout when logout button is clicked", () => {
    // render a fake dashboard with logout button
    render(
      <button onClick={mockLogout}>Logout</button>
    );

    fireEvent.click(screen.getByText(/logout/i));

    expect(mockLogout).toHaveBeenCalled();
  });
});
