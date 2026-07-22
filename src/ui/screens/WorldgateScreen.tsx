/**
 * Worldgate screen (task 2.4): the mission-launch hub. Lists available missions
 * (from `state.missions.available`), lets the player assemble a squad respecting
 * the exhausted rule, and launches via the `launchMission` action
 * (docs/specs/narrative-engine.md §3). Tactical missions are presented as
 * "coming" until the Phase 4 battle systems land. Portrait-friendly, touch
 * targets ≥ 44px (ARCHITECTURE §10).
 */
import { useState } from "react";
import { canLaunchMission } from "../../core/missions.js";
import { canBeSelectedForSquad } from "../../core/roster.js";
import type { Action } from "../../core/reducer.js";
import type { ContentBundleT, GameStateT } from "../../data/schemas.js";
import { ScreenHeader } from "../components/ScreenHeader.js";
import { strings } from "../strings.js";
import { buttonStyle, panelStyle, theme } from "../theme.js";

export function WorldgateScreen({
  state,
  content,
  dispatch,
  onBack,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
  onBack: () => void;
}) {
  const [squad, setSquad] = useState<string[]>([]);

  const toggle = (heroId: string) => {
    setSquad((prev) => (prev.includes(heroId) ? prev.filter((h) => h !== heroId) : [...prev, heroId]));
  };

  // veyra-kaempfe spec §2: during a running operation the squad is locked and
  // only that operation's missions are on offer.
  const deployment = state.deployment;
  const launchSquad = deployment ? deployment.squad : squad;

  const missions = state.missions.available
    .map((id) => content.missions.find((m) => m.id === id))
    .filter((m): m is ContentBundleT["missions"][number] => m !== undefined)
    .filter((m) => (deployment ? m.operation === deployment.operation : true));

  const launch = (missionId: string) => {
    // Pre-validated by the disabled state; dispatch runs the reducer's guard and
    // (on success) App routes to the mission screen. Within a deployment the core
    // reuses deployment.squad regardless of what is passed.
    dispatch({ type: "launchMission", mission: missionId, squad: launchSquad });
  };

  return (
    <div
      style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, fontFamily: theme.fontFamily }}
    >
      <ScreenHeader title={strings.worldgate.title} onBack={onBack} />
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
        {/* Deployment banner (spec §2): squad is locked, only the running
            operation's missions are offered. */}
        {deployment && (
          <section
            style={{
              ...panelStyle,
              borderColor: "#f0b45e",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            aria-label={strings.worldgate.deploymentActive}
          >
            <span aria-hidden="true">🚩</span>
            <span style={{ fontWeight: 600 }}>{strings.worldgate.deploymentActive}</span>
          </section>
        )}

        {/* Squad selection — hidden while a deployment locks the squad. */}
        {!deployment && (
          <section style={panelStyle} aria-label={strings.worldgate.squad}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{strings.worldgate.squad}</h2>
              <span style={{ color: theme.textDim, fontSize: "0.85rem" }}>
                {strings.worldgate.selectedCount(squad.length)}
              </span>
            </header>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {state.heroes.map((hero) => {
                const def = content.heroes.find((h) => h.id === hero.hero);
                const selectable = canBeSelectedForSquad(hero);
                const selected = squad.includes(hero.hero);
                return (
                  <button
                    key={hero.hero}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selectable}
                    onClick={() => toggle(hero.hero)}
                    style={{
                      ...buttonStyle(selected ? "primary" : "ghost"),
                      opacity: selectable ? 1 : 0.4,
                      flex: "1 1 45%",
                      minWidth: 140,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                      padding: "0.5rem 0.75rem",
                      height: "auto",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{def?.name ?? hero.hero}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>
                      {selectable ? strings.common.level(hero.level) : strings.common.exhausted}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Mission list */}
        {missions.length === 0 ? (
          <p style={{ color: theme.textDim }}>{strings.worldgate.noMissions}</p>
        ) : (
          missions.map((mission) => {
            const isTactical = mission.payload.kind === "tactical";
            const canLaunch = canLaunchMission(state, content, mission.id, launchSquad);
            return (
              <section key={mission.id} style={panelStyle} aria-label={mission.name}>
                <header style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", flex: 1, minWidth: 0 }}>{mission.name}</h3>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: isTactical ? "#f0b45e" : theme.accent,
                    }}
                  >
                    {isTactical ? strings.common.tactical : strings.common.narrative}
                  </span>
                </header>
                <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", color: theme.textDim }}>
                  {mission.description}
                </p>
                <div style={{ fontSize: "0.8rem", color: theme.textDim }}>
                  {strings.worldgate.squadRange(mission.squad.min, mission.squad.max)}
                </div>

                {/* v3-Nachtrag (§7): a mission tagged with an operation opens a
                    no-return deployment — warn about the recommended team size so
                    the player doesn't lock in an under-strength squad. */}
                {mission.operation !== undefined && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      marginTop: "0.35rem",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#f0b45e",
                    }}
                  >
                    <span aria-hidden="true">⚠️</span>
                    <span>{strings.worldgate.operationWarning}</span>
                  </div>
                )}

                <button
                  type="button"
                  style={{
                    ...buttonStyle(canLaunch ? "primary" : "ghost"),
                    width: "100%",
                    marginTop: "0.6rem",
                    opacity: canLaunch ? 1 : 0.4,
                  }}
                  disabled={!canLaunch}
                  onClick={() => launch(mission.id)}
                >
                  {canLaunch
                    ? isTactical
                      ? strings.worldgate.deploySquad
                      : strings.worldgate.launchMission
                    : strings.worldgate.selectFit(mission.squad.min, mission.squad.max)}
                </button>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
