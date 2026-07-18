import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.js";
import { ErrorBoundary } from "./ui/ErrorBoundary.js";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

/**
 * Last-resort fallback for failures the React tree never gets a chance to
 * render (e.g. an exception thrown while mounting, before ErrorBoundary
 * exists). Without this, such a failure is a silent white page.
 */
function renderFatalError(el: HTMLElement, error: unknown): void {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}` : String(error);
  el.innerHTML = "";
  const pre = document.createElement("pre");
  pre.style.cssText =
    "white-space: pre-wrap; word-break: break-word; padding: 1.5rem; margin: 0; " +
    "background: #0b0f1a; color: #ff6b6b; font-family: system-ui, sans-serif; min-height: 100vh; box-sizing: border-box;";
  pre.textContent = `Worldgate failed to start\n\n${message}`;
  el.appendChild(pre);
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (error) {
  renderFatalError(rootElement, error);
}
