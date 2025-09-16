// Test: mock MediaRecorder to simulate record → stop.

import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useAudioRecording } from "@/hooks/useAudioRecording";

class MockMediaRecorder {
  public state = "inactive";
  public ondataavailable: ((event: any) => void) | null = null;
  public onstop: (() => void) | null = null;
  private chunks: BlobPart[] = [];

  start() {
    this.state = "recording";
    // Simulate chunk being available
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob(["audio data"], { type: "audio/wav" }) });
    }, 0);
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }
}

describe("useAudioRecording", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock getUserMedia
    (global.navigator.mediaDevices as any) = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    };

    // Mock MediaRecorder globally
    (global as any).MediaRecorder = MockMediaRecorder;
  });

  it("starts and stops recording", async () => {
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.recordingState).toBe("recording");

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.hasRecorded).toBe(true);
    expect(result.current.audioBlob).toBeInstanceOf(Blob);
  });
});
