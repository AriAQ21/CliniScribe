// tests/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index";

// --- Mock react-router navigation ---
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

// --- Mock Supabase client safely ---
vi.mock("@/integrations/supabase/client", () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSelect }));
  const mockFrom = vi.fn(() => ({ select: vi.fn(() => ({ eq: mockEq })) }));

  return {
    supabase: { from: mockFrom },
    // expose mocks so we can configure them later
    __mocks: { mockSelect, mockEq, mockFrom },
  };
});

// Access mocks after import
const { __mocks } = await vi.importMock<any>(
  "@/integrations/supabase/client"
);
const { mockSelect, mockFrom } = __mocks;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Authentication flow (integration)", () => {
  it("logs in successfully and shows dashboard", async () => {
    mockSelect.mockResolvedValueOnce({
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
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/auth")
    );
    expect(localStorage.getItem("user_id")).toBeNull();
  });
});
