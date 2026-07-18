/**
 * Main menu / save-load screen (task 2.1). New-campaign flow, continue an
 * in-progress or autosaved campaign, and export/import the save string.
 */
import { useState, type CSSProperties } from "react";
import { buttonStyle, panelStyle, theme } from "../theme.js";

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 96,
  boxSizing: "border-box",
  padding: "0.6rem",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.bg,
  color: theme.text,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.8rem",
  resize: "vertical",
};

export function MainMenu({
  canContinue,
  exportString,
  onNewCampaign,
  onContinue,
  onImport,
}: {
  canContinue: boolean;
  exportString: string | null;
  onNewCampaign: () => void;
  onContinue: () => void;
  onImport: (text: string) => string | null;
}) {
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  const submitImport = () => {
    const error = onImport(importText);
    setImportError(error);
    if (!error) setImportText("");
  };

  const copyExport = () => {
    if (!exportString) return;
    void navigator.clipboard?.writeText(exportString).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        padding: "2rem 1rem",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 8vw, 3rem)", letterSpacing: "0.02em" }}>Worldgate</h1>
        <p style={{ margin: "0.25rem 0 0", color: theme.textDim }}>Strategic prototype</p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 420 }}>
        <button type="button" style={{ ...buttonStyle("primary"), width: "100%" }} onClick={onNewCampaign}>
          New Campaign
        </button>
        {canContinue && (
          <button type="button" style={{ ...buttonStyle("ghost"), width: "100%" }} onClick={onContinue}>
            Continue
          </button>
        )}

        {exportString && (
          <section style={panelStyle}>
            <button
              type="button"
              style={{ ...buttonStyle("ghost"), width: "100%" }}
              onClick={() => setShowExport((v) => !v)}
            >
              {showExport ? "Hide save string" : "Export save"}
            </button>
            {showExport && (
              <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <textarea readOnly style={textareaStyle} value={exportString} aria-label="Save string" />
                <button type="button" style={buttonStyle("ghost")} onClick={copyExport}>
                  {copied ? "Copied ✓" : "Copy to clipboard"}
                </button>
              </div>
            )}
          </section>
        )}

        <section style={panelStyle}>
          <h2 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>Import save</h2>
          <textarea
            style={textareaStyle}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
            placeholder="Paste a Worldgate save string…"
            aria-label="Import save string"
          />
          {importError && <p style={{ margin: "0.5rem 0 0", color: theme.danger }}>{importError}</p>}
          <button
            type="button"
            style={{ ...buttonStyle("ghost"), width: "100%", marginTop: "0.5rem" }}
            onClick={submitImport}
          >
            Load imported save
          </button>
        </section>
      </div>
    </div>
  );
}
