/**
 * Journal display (task 2.2) — the campaign log the sim writes to on end-of-day
 * and (later) mission resolution. Newest entries first.
 */
import type { GameStateT } from "../../data/schemas.js";
import { strings } from "../strings.js";
import { panelStyle, theme } from "../theme.js";

export function Journal({ state }: { state: GameStateT }) {
  const entries = state.journal;
  return (
    <section style={panelStyle} aria-label={strings.journal.title}>
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>{strings.journal.title}</h2>
      {entries.length === 0 ? (
        <p style={{ margin: 0, color: theme.textDim }}>{strings.journal.empty}</p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {entries
            .map((entry, i) => ({ entry, i }))
            .reverse()
            .map(({ entry, i }) => (
              <li key={i} style={{ display: "flex", gap: "0.6rem", fontSize: "0.9rem" }}>
                <span style={{ color: theme.accent, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {strings.journal.day(entry.day)}
                </span>
                <span style={{ color: theme.text }}>{entry.text}</span>
              </li>
            ))}
        </ol>
      )}
    </section>
  );
}
