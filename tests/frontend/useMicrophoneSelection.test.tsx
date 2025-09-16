import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, beforeEach, beforeAll, expect } from "vitest";
import { useMicrophoneSelection } from "@/hooks/useMicrophoneSelection";

describe("useMicrophoneSelection", () => {
  let listeners: Record<string, Function[]>;

  beforeAll(() => {
    // Provide a permissions shim if hook queries it
    (navigator as any).permissions ??= {
      query: vi.fn().mockResolvedValue({
        state: "granted",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listeners = {};

    // Mutate the existing mediaDevices created in setup.ts
    const md = navigator.mediaDevices as any;

    md.enumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: "default", label: "Default microphone", kind: "audioinput" },
      { deviceId: "mic1", label: "USB Microphone", kind: "audioinput" },
    ]);

    md.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });

    md.addEventListener = vi.fn((type: string, cb: Function) => {
      (listeners[type] ??= []).push(cb);
    });

    md.removeEventListener = vi.fn((type: string, cb: Function) => {
      listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== cb);
    });

    (md as any).__emit = (type: string) => {
      (listeners[type] ?? []).forEach((fn) => fn());
    };
  });

  it("loads available microphones on mount", async () => {
    const { result } = renderHook(() => useMicrophoneSelection());

    // If your hook waits for devicechange to refresh, emit it
    await act(async () => {
      (navigator.mediaDevices as any).__emit?.("devicechange");
    });

    await waitFor(() => expect(result.current.isLoadingDevices).toBe(false));

    expect(result.current.availableDevices).toHaveLength(2);
    expect(result.current.selectedDevice?.deviceId).toBe("default");
  });

  it("handles device enumeration error gracefully", async () => {
    (navigator.mediaDevices.enumerateDevices as any) = vi
      .fn()
      .mockRejectedValue(new Error("Permission denied"));

    const { result } = renderHook(() => useMicrophoneSelection());

    await act(async () => {
      (navigator.mediaDevices as any).__emit?.("devicechange");
    });

    await waitFor(() => expect(result.current.isLoadingDevices).toBe(false));

    expect(result.current.availableDevices).toHaveLength(0);
    expect(result.current.selectedDevice).toBeNull();
  });

  it("returns default constraints when no device selected", () => {
    const { result } = renderHook(() => useMicrophoneSelection());

    expect(result.current.getConstraintsForSelectedDevice()).toEqual({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });
  });

  it("sets up device change event listener", async () => {
    const { unmount } = renderHook(() => useMicrophoneSelection());

    expect(navigator.mediaDevices.addEventListener).toHaveBeenCalledWith(
      "devicechange",
      expect.any(Function)
    );

    unmount();

    expect(navigator.mediaDevices.removeEventListener).toHaveBeenCalledWith(
      "devicechange",
      expect.any(Function)
    );
  });
});
