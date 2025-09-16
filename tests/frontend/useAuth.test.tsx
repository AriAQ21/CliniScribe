import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useAuth } from "@/hooks/useAuth";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    })),
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("handles successful login", async () => {
    const mockUser = {
      user_id: 123,
      first_name: "John",
      last_name: "Doe", 
      role: "doctor",
      location: "Hospital A",
      email: "john@test.com",
    };

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          })),
        })),
      })),
    } as any);

    const { result } = renderHook(() => useAuth());

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login("john@test.com", "password123");
    });

    expect(loginResult).toEqual({ user: mockUser });
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("handles login with invalid credentials", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: "Invalid credentials" }),
          })),
        })),
      })),
    } as any);

    const { result } = renderHook(() => useAuth());

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login("wrong@test.com", "wrongpassword");
    });

    expect(loginResult).toEqual({ error: "Invalid email or password" });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("handles logout correctly", async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });
});