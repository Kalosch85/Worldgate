/**
 * Post-mission summary action buttons (veyra-kaempfe spec §2a).
 *
 * When a deployment is running and the just-resolved mission unlocked exactly
 * one further mission of the same operation, the summary offers a primary
 * "Weiter: [Missionsname]" button that launches it directly with the locked
 * deployment squad — no detour through the base, no squad picker. The return-to-
 * base button stays as a secondary fallback (the worldgate remains functional
 * either way). Outside a deployment, only the return button shows — unchanged.
 *
 * Pure presentation: the single-next-mission decision is the `deploymentNextMission`
 * core selector (ARCHITECTURE §1); this component just renders the choice and
 * calls back.
 */
import { deploymentNextMission } from "../../core/missions.js";
import type { ContentBundleT, GameStateT } from "../../data/schemas.js";
import { strings } from "../strings.js";
import { buttonStyle } from "../theme.js";

export function SummaryActions({
  state,
  content,
  newlyUnlocked,
  onContinue,
  onReturn,
}: {
  state: GameStateT;
  content: ContentBundleT;
  newlyUnlocked: readonly string[];
  /** Launch the operation's next mission directly (spec §2a). */
  onContinue: (missionId: string) => void;
  /** Return to the base view (the always-available fallback). */
  onReturn: () => void;
}) {
  const nextId = deploymentNextMission(state, content, newlyUnlocked);
  const nextDef = nextId ? content.missions.find((m) => m.id === nextId) : undefined;

  return (
    <>
      {nextId && nextDef && (
        <button
          type="button"
          style={{ ...buttonStyle("primary"), width: "100%", marginTop: "1rem" }}
          onClick={() => onContinue(nextId)}
        >
          {strings.common.continueTo(nextDef.name)}
        </button>
      )}
      <button
        type="button"
        style={{
          ...buttonStyle(nextId ? "ghost" : "primary"),
          width: "100%",
          marginTop: nextId ? "0.5rem" : "1rem",
        }}
        onClick={onReturn}
      >
        {strings.common.returnToBase}
      </button>
    </>
  );
}
