// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index";

// --- mocks ---
// spy for navigate
const mockNavigate = vi.fn();

// ✅ synchronous mock (no await inside vi.mock)
vi.mock("react-router-dom", () => {
  const actual = require("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ✅ supabase mock
vi.mock("@/integrations/supabase/client", () => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  return {
    supabase: { from: mockFrom },
    __mocks: { mockFrom, mockSelect, mockEq, mockSingle },
  };
});

const { mockSingle } = (vi.mocked(
  require("@/integrations/supabase/client")
).__mocks);

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // ✅ ensures mocks are always fresh per test
    localStorage.clear();
  });

  it("logs in successfully and navigates to dashboard", async () => {
    // arrange supabase mock
    mockSingle.mockResolvedValueOnce({
      data: {
        user_id: 1,
        first_name: "Alice",
        last_name: "Doe",
        email: "alice@email.com",
        role: "doctor",
        location: "Room 1",
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
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

    // ✅ assert navigate OR dashboard content
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  it("logs out successfully and navigates to auth page", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });
});
