import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

// 🩹 Polyfill matchMedia for JSDOM
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe("Full Clinician Journey (Integration)", () => {
  it("completes full flow: login → record → transcript → edit → save → reload", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    // Step 1: Dashboard should load
    await waitFor(() => {
      expect(
        screen.getByText(/scheduled appointments/i)
      ).toBeInTheDocument();
    });

    // Step 2: Click "View Details" for first appointment
    const viewDetailsButton = screen.getByRole("button", {
      name: /view details/i,
    });
    await userEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(window.location.pathname).toMatch(/\/appointment\/\d+/);
    });

    // Step 3: Start recording
    const startRecordingButton = await screen.findByRole("button", {
      name: /start recording/i,
    });
    await userEvent.click(startRecordingButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /stop recording/i })
      ).toBeInTheDocument();
    });

    // Step 4: Stop recording
    const stopRecordingButton = screen.getByRole("button", {
      name: /stop recording/i,
    });
    await userEvent.click(stopRecordingButton);

    // Step 5: Wait for transcript to appear
    await waitFor(() => {
      expect(screen.getByText(/transcript/i)).toBeInTheDocument();
    });

    // Step 6: Edit transcript
    const transcriptBox = screen.getByRole("textbox");
    await userEvent.type(transcriptBox, " Edited");

    // Step 7: Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/progress saved/i)
      ).toBeInTheDocument();
    });

    // Step 8: Reload & verify saved transcript
    render(
      <MemoryRouter initialEntries={[window.location.pathname]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });
  });
});
