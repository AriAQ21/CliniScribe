import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// Hold references to mocks
let mockSingle: ReturnType<typeof vi.fn>;
let mockFrom: ReturnType<typeof vi.fn>;

// Supabase mock
vi.doMock("@/integrations/supabase/client", () => {
  mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  mockFrom = vi.fn(() => ({ select: mockSelect }));

  return { supabase: { from: mockFrom } };
});

describe("Authentication flow (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Re-initialize Supabase mock for each test
    mockSingle.mockReset();
    mockFrom.mockReset();
  });

  it("logs in successfully and navigates to dashboard", async () => {
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

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
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
    });
  });
});
