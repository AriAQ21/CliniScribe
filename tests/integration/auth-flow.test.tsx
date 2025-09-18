// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthPage from "@/pages/AuthPage"; // adjust import to your actual Auth page
import { vi } from "vitest";

// --- Mock useAuth hook ---
const mockLogin = vi.fn();
const mockLogout = vi.fn();

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

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls login on successful form submit", async () => {
    mockLogin.mockResolvedValueOnce({
      user: { id: 1, email: "alice@email.com" },
    });

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
