/**
 * App shell (task 2.1). Owns the in-memory campaign, routes between the main
 * menu and the base screen, and wires save/load: every dispatched action runs
 * through core's pure reducer and autosaves to localStorage (ARCHITECTURE §3).
 *
 * The UI implements no rules — it dispatches actions and renders state
 * (ARCHITECTURE §1). RuleError from the reducer is surfaced as a banner.
 */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { newCampaign } from "../core/campaign.js";
import { canStartResearch } from "../core/economy.js";
import { RuleError } from "../core/errors.js";
import { newlyUnlockedMissions } from "../core/missions.js";
import { apply, type Action } from "../core/reducer.js";
import { mulberry32, type Rng } from "../core/rng.js";
import { loadContent } from "../data/loadContent.js";
import type { GameStateT } from "../data/schemas.js";
import { BattleScreen } from "../tactics-render/BattleScreen.js";
import { exportSave, importSave, loadFromStorage, saveToStorage } from "./persistence.js";
import { BaseScreen } from "./screens/BaseScreen.js";
import { EventScreen } from "./screens/EventScreen.js";
import { MainMenu } from "./screens/MainMenu.js";
import { RosterScreen } from "./screens/RosterScreen.js";
import { TechScreen } from "./screens/TechScreen.js";
import { WorldgateScreen } from "./screens/WorldgateScreen.js";
import { buttonStyle, theme } from "./theme.js";

type Screen = "menu" | "base" | "tech" | "roster" | "worldgate" | "event" | "battle";

/** The screen an in-progress mission must route directly to (spec §11 / the
 * narrative activeMission rule): a tactical mission → the battle screen, a
 * narrative one → the event screen. */
function missionScreen(state: GameStateT | null): Screen | null {
  const kind = state?.activeMission?.kind;
  if (kind === "tactical") return "battle";
  if (kind === "narrative") return "event";
  return null;
}

/** A random 32-bit campaign seed. UI layer — free to use Math.random (§1). */
function newSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export function App() {
  const content = useMemo(() => loadContent(), []);

  const [state, setStateRaw] = useState<GameStateT | null>(() => loadFromStorage());
  const [screen, setScreen] = useState<Screen>("menu");
  const [message, setMessage] = useState<string | null>(null);

  // The missions the most recent resolution unlocked — feeds the post-mission
  // summary's "Next:" section (computed by the newlyUnlockedMissions selector).
  const [lastUnlocks, setLastUnlocks] = useState<string[]>([]);

  // Mission ids the player has already seen on the worldgate screen. UI-only,
  // never persisted (ARCHITECTURE §3): a mission that becomes available while
  // it's not in this set pulses the worldgate nav until the player looks. Seeded
  // from whatever was already available (a fresh campaign has none, so the first
  // unlock still draws attention; a loaded save doesn't re-flag old missions).
  const initialState = useRef(state);
  const [seenMissions, setSeenMissions] = useState<ReadonlySet<string>>(
    () => new Set(initialState.current?.missions.available ?? []),
  );

  // Kept in sync with `state` so dispatch reads the latest value synchronously.
  const stateRef = useRef(state);
  const setState = (next: GameStateT) => {
    stateRef.current = next;
    setStateRaw(next);
  };

  // One RNG per campaign seed, recreated when the seed changes (new / loaded
  // campaign). endDay consumes no RNG today; the stream is here for the
  // sanctioned injury draw once missions land.
  const rngRef = useRef<{ seed: number; rng: Rng } | null>(null);
  const rngFor = (seed: number): Rng => {
    if (!rngRef.current || rngRef.current.seed !== seed) {
      rngRef.current = { seed, rng: mulberry32(seed) };
    }
    return rngRef.current.rng;
  };

  const dispatch = (action: Action) => {
    const prev = stateRef.current;
    if (!prev) return;
    try {
      const next = apply(prev, action, { content, rng: rngFor(prev.campaign.seed) });
      setState(next);
      saveToStorage(next);
      setMessage(null);
      // A mission just opened (launched, or a queued incident fired by endDay)
      // — route straight to its screen and hold there until it resolves: a
      // narrative mission to the event screen (spec §7), a tactical mission to
      // the battle screen (tactics-engine §11).
      if (prev.activeMission === null && next.activeMission !== null) {
        const target = missionScreen(next);
        if (target) setScreen(target);
      }
      // A mission just resolved — capture what it unlocked for the summary's
      // "Next:" section.
      if (prev.activeMission !== null && next.activeMission === null) {
        setLastUnlocks(newlyUnlockedMissions(prev, next));
      }
    } catch (err) {
      if (err instanceof RuleError) setMessage(err.message);
      else throw err;
    }
  };

  const startCampaign = () => {
    // D-9: a new campaign opens on the intro event — route straight to it.
    const next = newCampaign(newSeed(), content);
    setState(next);
    saveToStorage(next);
    setSeenMissions(new Set(next.missions.available));
    setLastUnlocks([]);
    setMessage(null);
    setScreen(missionScreen(next) ?? "base");
  };

  const handleImport = (text: string): string | null => {
    const result = importSave(text);
    if (!result.ok) return result.error;
    setState(result.state);
    saveToStorage(result.state);
    setSeenMissions(new Set(result.state.missions.available));
    setLastUnlocks([]);
    setMessage(null);
    setScreen("base");
    return null;
  };

  // Navigate, and — when opening the worldgate — mark everything currently
  // available as seen so its nav pulse clears (attention affordance).
  const navigate = (target: Screen) => {
    if (target === "worldgate" && stateRef.current) {
      setSeenMissions(new Set(stateRef.current.missions.available));
    }
    setScreen(target);
  };

  if (state && screen !== "menu") {
    const withBanner = (node: ReactNode) => (
      <>
        {node}
        {message && <Banner text={message} onDismiss={() => setMessage(null)} />}
      </>
    );
    // Attention affordances: pulse the research nav when nothing is being
    // researched (and something can be), and the worldgate nav when a mission
    // became available that the player hasn't looked at yet.
    const researchAttention =
      state.research.current === null && content.techs.some((t) => canStartResearch(state, content, t.id));
    const worldgateAttention = state.missions.available.some((id) => !seenMissions.has(id));
    switch (screen) {
      case "base":
        return withBanner(
          <BaseScreen
            state={state}
            content={content}
            dispatch={dispatch}
            onOpenMenu={() => setScreen("menu")}
            onNavigate={navigate}
            researchAttention={researchAttention}
            worldgateAttention={worldgateAttention}
          />,
        );
      case "tech":
        return withBanner(
          <TechScreen state={state} content={content} dispatch={dispatch} onBack={() => setScreen("base")} />,
        );
      case "roster":
        return withBanner(<RosterScreen state={state} content={content} onBack={() => setScreen("base")} />);
      case "worldgate":
        return withBanner(
          <WorldgateScreen
            state={state}
            content={content}
            dispatch={dispatch}
            onBack={() => setScreen("base")}
          />,
        );
      case "event":
        return withBanner(
          <EventScreen
            state={state}
            content={content}
            dispatch={dispatch}
            newlyUnlocked={lastUnlocks}
            onDone={() => setScreen("base")}
          />,
        );
      case "battle":
        return withBanner(
          <BattleScreen
            state={state}
            content={content}
            dispatch={dispatch}
            newlyUnlocked={lastUnlocks}
            onExit={() => setScreen("base")}
          />,
        );
    }
  }

  return (
    <MainMenu
      canContinue={state !== null}
      exportString={state ? exportSave(state) : null}
      onNewCampaign={startCampaign}
      onContinue={() => setScreen(missionScreen(state) ?? "base")}
      onImport={handleImport}
    />
  );
}

function Banner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "1rem",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        maxWidth: "min(92vw, 520px)",
        padding: "0.6rem 0.9rem",
        borderRadius: 10,
        background: theme.surfaceAlt,
        border: `1px solid ${theme.danger}`,
        color: theme.text,
        fontFamily: theme.fontFamily,
        boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ flex: 1 }}>{text}</span>
      <button type="button" style={{ ...buttonStyle("ghost"), minWidth: theme.touch }} onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
