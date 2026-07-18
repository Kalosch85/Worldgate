/**
 * Roster screen (task 2.3): a card per hero showing effective skills, fatigue
 * state, and XP/level progress. Read-only — all values come from core selectors
 * (roster.ts), never recomputed here (ARCHITECTURE §1, §2). Portrait-friendly.
 */
import type { CSSProperties } from "react";
import { SkillId, type ContentBundleT, type GameStateT, type SkillIdT } from "../../data/schemas.js";
import {
  FATIGUE_EXHAUSTED,
  FATIGUE_TIRED,
  MAX_LEVEL,
  XP_THRESHOLDS,
  effectiveSkills,
  isExhausted,
  isTired,
} from "../../core/roster.js";
import { ScreenHeader } from "../components/ScreenHeader.js";
import { panelStyle, theme } from "../theme.js";

type HeroStateT = GameStateT["heroes"][number];

const SKILL_LABELS: Record<SkillIdT, string> = {
  combat: "Combat",
  science: "Science",
  engineering: "Engineering",
  diplomacy: "Diplomacy",
  resolve: "Resolve",
};

/** Fatigue label + color: Fit / Tired (≥50) / Exhausted (≥80). */
function fatigueStatus(hero: HeroStateT): { label: string; color: string } {
  if (isExhausted(hero)) return { label: "Exhausted", color: theme.danger };
  if (isTired(hero)) return { label: "Tired", color: "#f0b45e" };
  return { label: "Fit", color: theme.good };
}

/** Progress toward the next level: current/needed XP and a 0..1 fraction. */
function levelProgress(hero: HeroStateT): { atCap: boolean; into: number; span: number; frac: number } {
  if (hero.level >= MAX_LEVEL) return { atCap: true, into: 0, span: 0, frac: 1 };
  const floor = XP_THRESHOLDS[hero.level - 1]!;
  const next = XP_THRESHOLDS[hero.level]!;
  const span = next - floor;
  const into = hero.xp - floor;
  return { atCap: false, into, span, frac: span > 0 ? into / span : 0 };
}

export function RosterScreen({
  state,
  content,
  onBack,
}: {
  state: GameStateT;
  content: ContentBundleT;
  onBack: () => void;
}) {
  return (
    <div
      style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, fontFamily: theme.fontFamily }}
    >
      <ScreenHeader title="Roster" onBack={onBack} />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "0.75rem",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        {state.heroes.length === 0 ? (
          <p style={{ color: theme.textDim }}>No heroes on the roster.</p>
        ) : (
          state.heroes.map((hero) => {
            const def = content.heroes.find((h) => h.id === hero.hero);
            if (!def) return null;
            const skills = effectiveSkills(hero, def, content.injuries);
            const fatigue = fatigueStatus(hero);
            const progress = levelProgress(hero);
            return (
              <section key={hero.hero} style={panelStyle} aria-label={def.name}>
                <header style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", flex: 1, minWidth: 0 }}>{def.name}</h2>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.5rem",
                      borderRadius: 999,
                      background: theme.surfaceAlt,
                      border: `1px solid ${theme.border}`,
                      color: theme.accent,
                    }}
                  >
                    Lv {hero.level}
                    {progress.atCap ? " · MAX" : ""}
                  </span>
                </header>

                <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: theme.textDim }}>
                  {def.archetypes.join(" · ")}
                </div>

                {/* XP toward next level */}
                <div style={{ marginTop: "0.6rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      color: theme.textDim,
                      marginBottom: 3,
                    }}
                  >
                    <span>XP</span>
                    <span>
                      {progress.atCap ? `${hero.xp} (max level)` : `${progress.into} / ${progress.span}`}
                    </span>
                  </div>
                  <Meter frac={progress.frac} color={theme.accent} />
                </div>

                {/* Fatigue */}
                <div style={{ marginTop: "0.6rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      color: theme.textDim,
                      marginBottom: 3,
                    }}
                  >
                    <span>Fatigue</span>
                    <span style={{ color: fatigue.color, fontWeight: 600 }}>
                      {Math.round(hero.fatigue)} · {fatigue.label}
                    </span>
                  </div>
                  <Meter frac={Math.min(1, hero.fatigue / 100)} color={fatigue.color} />
                  <div style={{ fontSize: "0.7rem", color: theme.textDim, marginTop: 3 }}>
                    Tired ≥ {FATIGUE_TIRED} (−1 all skills) · Exhausted ≥ {FATIGUE_EXHAUSTED} (benched)
                  </div>
                </div>

                {/* Effective skills */}
                <div
                  style={{
                    marginTop: "0.7rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
                    gap: "0.4rem",
                  }}
                >
                  {SkillId.options.map((skill) => {
                    const eff = skills[skill];
                    const base = def.skills[skill] + (hero.skillBonuses[skill] ?? 0);
                    const delta = eff - base; // fatigue + injury penalties
                    return (
                      <div
                        key={skill}
                        style={{
                          background: theme.surfaceAlt,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 8,
                          padding: "0.35rem 0.5rem",
                        }}
                      >
                        <div
                          style={{ fontSize: "0.65rem", color: theme.textDim, textTransform: "uppercase" }}
                        >
                          {SKILL_LABELS[skill]}
                        </div>
                        <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                          {eff}
                          {delta !== 0 && (
                            <span style={{ fontSize: "0.7rem", color: theme.danger, marginLeft: 4 }}>
                              ({delta > 0 ? "+" : ""}
                              {delta})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Injuries */}
                {hero.injuries.length > 0 && (
                  <div style={{ marginTop: "0.6rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {hero.injuries.map((inj, i) => {
                      const idef = content.injuries.find((d) => d.id === inj.injury);
                      return (
                        <span
                          key={i}
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: 999,
                            background: "rgba(255,107,107,0.12)",
                            border: `1px solid ${theme.danger}`,
                            color: theme.danger,
                          }}
                        >
                          {idef?.name ?? inj.injury} · {inj.daysRemaining}d
                        </span>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}

function Meter({ frac, color }: { frac: number; color: string }) {
  const track: CSSProperties = {
    height: 8,
    borderRadius: 999,
    background: theme.surfaceAlt,
    border: `1px solid ${theme.border}`,
    overflow: "hidden",
  };
  return (
    <div style={track}>
      <div
        style={{
          height: "100%",
          width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`,
          background: color,
        }}
      />
    </div>
  );
}
