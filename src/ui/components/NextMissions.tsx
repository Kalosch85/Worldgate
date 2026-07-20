/**
 * The auto-derived "Next:" section of a post-mission summary. Given the mission
 * ids a resolution just unlocked (from the `newlyUnlockedMissions` core
 * selector), it lists their names so the player sees what opened up. Renders
 * nothing when nothing was unlocked. Pure presentation — the diff is computed in
 * core (ARCHITECTURE §1).
 */
import type { ContentBundleT } from "../../data/schemas.js";
import { strings } from "../strings.js";
import { theme } from "../theme.js";

export function NextMissions({
  missionIds,
  content,
}: {
  missionIds: readonly string[];
  content: ContentBundleT;
}) {
  if (missionIds.length === 0) return null;
  const entries = missionIds.map((id) => {
    const def = content.missions.find((m) => m.id === id);
    return { id, name: def?.name ?? id, tactical: def?.payload.kind === "tactical" };
  });

  return (
    <section aria-label={strings.nextMissions.ariaLabel} style={{ marginTop: "0.9rem" }}>
      <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem", color: theme.textDim }}>
        {strings.nextMissions.title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {entries.map((e) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.6rem",
              borderRadius: 8,
              background: theme.surfaceAlt,
              border: `1px solid ${theme.accent}`,
            }}
          >
            <span aria-hidden="true">🌐</span>
            <span style={{ fontWeight: 600, flex: 1 }}>{e.name}</span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: e.tactical ? "#f0b45e" : theme.accent,
              }}
            >
              {e.tactical ? strings.common.tactical : strings.common.narrative}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
