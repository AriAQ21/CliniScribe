import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, beforeEach, expect } from "vitest";

import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Index";

// 🔹 Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// 🔹 Supabase mock with logging
vi.mock("@/integrations/supabase/client", () => {
  const mockSingle = vi.fn();
  const chain = {
    eq: vi.fn((...args) => {
      console.log("🟡 supabase.eq called with:", args);
      return chain;
    }),
    single: vi.fn((...args) => {
      console.log("🟡 supabase.single called with:", args);
      return mockSingle();
    }),
  };

  const mockSelect = vi.fn((...args) => {
    console.log("🟡 supabase.select called with:", args);
    return chain;
  });

  const mockFrom = vi.fn((...args) => {
    console.log("🟡 supabase.from called with:", args);
    return { select: mockSelect };
  });

  return {
    supabase: { from: mockFrom },
    __mocks: { mockFrom, mockSelect, mockSingle },
  };
});

describe("Authentication flow (integration)", () => {
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // Import fresh mocks each time
    const { __mocks } = await import("@/integrations/supabase/client");
    mockSingle = __mocks.mockSingle;
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
