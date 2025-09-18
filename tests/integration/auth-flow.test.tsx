// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index"; // your dashboard page

// --- Mock useNavigate ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// --- Mock Supabase client ---
vi.mock("@/integrations/supabase/client", () => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  return {
    supabase: { from: mockFrom },
    // expose helpers so we can control them in tests
    __mocks: { mockFrom, mockSelect, mockEq, mockSingle },
  };
});

// pull out the mocks so we can use them in tests
const { mockSingle } = (vi.mocked(
  await import("@/integrations/supabase/client")
).__mocks);

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("logs in successfully and shows dashboard", async () => {
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

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    );
    expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
  });

  it("logs out successfully and navigates to auth page", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/auth")
    );
    expect(await screen.findByText(/sign in/i)).toBeInTheDocument();
  });
});
