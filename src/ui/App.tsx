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
import { RuleError } from "../core/errors.js";
import { apply, type Action } from "../core/reducer.js";
import { mulberry32, type Rng } from "../core/rng.js";
import { loadContent } from "../data/loadContent.js";
import type { GameStateT } from "../data/schemas.js";
import { exportSave, importSave, loadFromStorage, saveToStorage } from "./persistence.js";
import { BaseScreen } from "./screens/BaseScreen.js";
import { EventScreen } from "./screens/EventScreen.js";
import { MainMenu } from "./screens/MainMenu.js";
import { RosterScreen } from "./screens/RosterScreen.js";
import { TechScreen } from "./screens/TechScreen.js";
import { WorldgateScreen } from "./screens/WorldgateScreen.js";
import { buttonStyle, theme } from "./theme.js";

type Screen = "menu" | "base" | "tech" | "roster" | "worldgate" | "event";

/** A random 32-bit campaign seed. UI layer — free to use Math.random (§1). */
function newSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export function App() {
  const content = useMemo(() => loadContent(), []);

  const [state, setStateRaw] = useState<GameStateT | null>(() => loadFromStorage());
  const [screen, setScreen] = useState<Screen>("menu");
  const [message, setMessage] = useState<string | null>(null);

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
      // A narrative mission just opened (launched, or a queued incident fired by
      // endDay) — take over with the event screen until it resolves (spec §7).
      if (prev.activeMission === null && next.activeMission?.kind === "narrative") {
        setScreen("event");
      }
    } catch (err) {
      if (err instanceof RuleError) setMessage(err.message);
      else throw err;
    }
  };

  const startCampaign = () => {
    const next = newCampaign(newSeed());
    setState(next);
    saveToStorage(next);
    setMessage(null);
    setScreen("base");
  };

  const handleImport = (text: string): string | null => {
    const result = importSave(text);
    if (!result.ok) return result.error;
    setState(result.state);
    saveToStorage(result.state);
    setMessage(null);
    setScreen("base");
    return null;
  };

  if (state && screen !== "menu") {
    const withBanner = (node: ReactNode) => (
      <>
        {node}
        {message && <Banner text={message} onDismiss={() => setMessage(null)} />}
      </>
    );
    switch (screen) {
      case "base":
        return withBanner(
          <BaseScreen
            state={state}
            dispatch={dispatch}
            onOpenMenu={() => setScreen("menu")}
            onNavigate={setScreen}
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
            onDone={() => setScreen("base")}
          />,
        );
    }
  }

  return (
    <MainMenu
      canContinue={state !== null}
      exportString={state ? exportSave(state) : null}
      onNewCampaign={startCampaign}
      onContinue={() => setScreen(state?.activeMission?.kind === "narrative" ? "event" : "base")}
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
