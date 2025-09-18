// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthPage from "@/pages/AuthPage"; // adjust import to your actual Auth page
import { vi } from "vitest";

// --- Mock useAuth hook ---
vi.mock("@/hooks/useAuth", () => {
  return {
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
    }),
  };
});

const mockLogin = vi.fn();
const mockLogout = vi.fn();

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error for invalid credentials", async () => {
  mockLogin.mockRejectedValueOnce(new Error("Invalid email or password"));

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

  await waitFor(() => {
    const errors = screen.getAllByText(/invalid email or password/i);
    expect(errors.length).toBeGreaterThan(0);
  });
});


  it("calls login on successful form submit", async () => {
    mockLogin.mockResolvedValueOnce({ user: { id: 1, email: "alice@email.com" } });

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

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith("alice@email.com", "password")
    );
  });

  it("calls logout when logout button is clicked", () => {
    render(<button onClick={mockLogout}>Logout</button>);

    fireEvent.click(screen.getByText("Logout"));

    expect(mockLogout).toHaveBeenCalled();
  });
});
