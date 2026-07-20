/**
 * Startup smoke test (white-page fix). Runs the real app entry point
 * (main.tsx) against a jsdom #root, exactly like the deployed page does, and
 * fails CI if startup throws or falls back to the ErrorBoundary. This is what
 * would have caught the base-path regression: CI was green because unit
 * tests exercised <App /> directly, never the actual boot path that a
 * misconfigured base path or a startup exception breaks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

describe("app boot", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    localStorage.clear();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    document.body.innerHTML = "";
    localStorage.clear();
    vi.resetModules();
  });

  it("mounts at #root without throwing or tripping the error boundary", async () => {
    // main.tsx calls createRoot(...).render() at module scope, outside any
    // act() wrapper (it's the real app entry point, not a test helper) — flush
    // it the same way the browser's event loop would.
    await act(async () => {
      await import("./main.js");
    });

    const root = document.getElementById("root");
    expect(root).not.toBeNull();
    expect(root!.textContent).not.toContain("Worldgate konnte nicht starten");
    expect(root!.textContent).toContain("Neue Kampagne");

    const crashLogs = consoleErrorSpy.mock.calls.filter((call: unknown[]) => {
      const first = call[0];
      return typeof first === "string" && first.includes("Worldgate crashed during render");
    });
    expect(crashLogs).toHaveLength(0);
  });
});
