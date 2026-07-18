/**
 * Task 0.1 hello-world shell. Proves the Vite/React/TS toolchain builds and
 * deploys. Real strategic screens arrive in Phase 2; this stays deliberately
 * thin (ARCHITECTURE §1: ui renders, it does not implement rules).
 */
export function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e8ecf5",
        background: "#0b0f1a",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "clamp(2rem, 8vw, 3.5rem)", letterSpacing: "0.02em" }}>Worldgate</h1>
      <p style={{ margin: 0, opacity: 0.75, maxWidth: "32ch", lineHeight: 1.5 }}>
        Prototype foundation online. Toolchain wired — strategic and tactical layers to come.
      </p>
    </main>
  );
}
