/**
 * Startup safety net (white-page fix). A blank page with a green CI run is
 * the worst failure mode: something threw during render and the browser
 * shows nothing, so there is no signal to debug from. This boundary catches
 * render-phase exceptions (bad content JSON, a broken save, a reducer bug)
 * and renders the error on screen instead of leaving a white page.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { theme } from "./theme.js";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Worldgate crashed during render:", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "1.5rem",
          background: theme.bg,
          color: theme.text,
          fontFamily: theme.fontFamily,
        }}
      >
        <h1 style={{ color: theme.danger, marginTop: 0 }}>Worldgate failed to start</h1>
        <p style={{ color: theme.textDim }}>
          Something threw during startup instead of rendering the app. Reloading may help; if not, this is a
          bug worth reporting with the details below.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: theme.surfaceAlt,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          {error.name}: {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
      </div>
    );
  }
}
