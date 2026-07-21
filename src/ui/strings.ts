/**
 * UI strings (task D-12: Deutsch als Spielsprache).
 *
 * Single source of every player-visible string rendered by the React strategic
 * screens (`src/ui`) and the tactical renderer (`src/tactics-render`). No i18n
 * framework by design (D-12): one file, one language. A future language is a
 * file swap, not new machinery.
 *
 * Scope note (ARCHITECTURE §1): `src/core` is pure sim logic and may not import
 * from `src/ui`, so the handful of player-visible strings the core itself writes
 * (journal lines, RuleError messages surfaced in the banner, the tactical
 * combat-log verbs) live as German literals inside their core modules, not here.
 */
import type { ResourceIdT, SkillIdT } from "../data/schemas.js";

/** Resource chip/label names, keyed by the schema resource id. */
export const RESOURCE_LABELS: Record<ResourceIdT, string> = {
  funds: "Mittel",
  materials: "Material",
  intel: "Aufklärung",
  exotics: "Exotika",
};

/** Effective-skill labels, keyed by the schema skill id. */
export const SKILL_LABELS: Record<SkillIdT, string> = {
  combat: "Kampf",
  science: "Wissenschaft",
  engineering: "Technik",
  diplomacy: "Diplomatie",
  resolve: "Entschlossenheit",
};

/** Archetype-tag labels (schema `ArchetypeTag`); falls back to the raw id. */
const ARCHETYPE_LABELS: Record<string, string> = {
  soldier: "Soldat",
  scientist: "Wissenschaftler",
  engineer: "Techniker",
  diplomat: "Diplomat",
  scout: "Späher",
};

export function archetypeLabel(tag: string): string {
  return ARCHETYPE_LABELS[tag] ?? tag;
}

/** Display labels for the campaign variables the player can see change. */
const VARIABLE_LABELS: Record<string, string> = {
  support: "Unterstützung",
  doubt: "Zweifel",
  trust_andara: "Vertrauen Andara",
};

/** Prettify a variable id for a delta chip: known ones get a curated label,
 * unknown ones fall back to a spaced, capitalized form (`trust_x` → "Trust x"). */
export function variableLabel(name: string): string {
  const known = VARIABLE_LABELS[name];
  if (known) return known;
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const strings = {
  common: {
    returnToBase: "Zurück zur Basis",
    backToBase: "← Basis",
    tactical: "Taktisch",
    narrative: "Erzählung",
    exhausted: "Erschöpft",
    level: (n: number) => `St. ${n}`,
  },

  resources: {
    day: "Tag",
    funds: "Mittel",
    materials: "Material",
    intel: "Aufklärung",
    exotics: "Exotika",
    support: "Unterstützung",
  },

  errorBoundary: {
    title: "Worldgate konnte nicht starten",
    body: "Beim Start wurde ein Fehler geworfen, statt die App zu rendern. Ein Neuladen kann helfen; falls nicht, ist dies ein Fehler, der mit den Angaben unten gemeldet werden sollte.",
  },

  mainMenu: {
    subtitle: "Strategischer Prototyp",
    newCampaign: "Neue Kampagne",
    continue: "Fortsetzen",
    hideSave: "Spielstand-Zeichenkette verbergen",
    exportSave: "Spielstand exportieren",
    saveStringLabel: "Spielstand-Zeichenkette",
    copied: "Kopiert ✓",
    copy: "In Zwischenablage kopieren",
    importSave: "Spielstand importieren",
    importPlaceholder: "Eine Worldgate-Spielstand-Zeichenkette einfügen…",
    importAriaLabel: "Spielstand-Zeichenkette importieren",
    loadImported: "Importierten Spielstand laden",
    pasteFirst: "Bitte zuerst eine Spielstand-Zeichenkette einfügen.",
    invalidSave: "Das ist kein gültiger Worldgate-Spielstand.",
  },

  base: {
    menu: "☰ Menü",
    endDay: "Tag beenden →",
    missionInProgress: "Eine Mission läuft. Schließe sie ab, bevor der Tag weitergeht.",
    worldgate: "🌐 Weltentor",
    roster: "👥 Team",
    research: "🔬 Forschung",
    newMissionAvailable: "Neue Mission verfügbar",
    noResearchInProgress: "Keine Forschung aktiv",
  },

  personnel: {
    title: "Personal",
    idle: (idle: number, total: number) => `${idle} untätig / ${total}`,
    removeFrom: (label: string) => `Einen aus ${label} entfernen`,
    addTo: (label: string) => `Einen zu ${label} hinzufügen`,
    tracks: {
      logistics: { label: "Logistik", drives: "Einnahmen an Mitteln" },
      research: { label: "Forschung", drives: "Forschungspunkte / Tag" },
      infirmary: { label: "Krankenrevier", drives: "Erholung von Erschöpfung & Verletzungen" },
    },
  },

  facilities: {
    title: "Einrichtungen",
    building: (name: string) => `Im Bau: ${name}`,
    daysLeft: (n: number) => `${n} ${n === 1 ? "Tag" : "Tage"} übrig`,
    built: "Gebaut",
    locked: "· gesperrt",
    build: "Bauen",
  },

  journal: {
    title: "Journal",
    empty: "Noch nichts verzeichnet. Beende einen Tag, um die Kampagne voranzubringen.",
    day: (n: number) => `Tag ${n}`,
  },

  nextMissions: {
    title: "Als Nächstes",
    ariaLabel: "Neu verfügbare Missionen",
  },

  tech: {
    title: "Forschung",
    currentResearch: "Aktuelle Forschung",
    rp: (progress: number, cost: number) => `${progress} / ${cost} FP`,
    costRp: (cost: number) => `${cost} FP`,
    nothingUnderResearch: "Keine Forschung aktiv. Wähle unten eine Technologie, um zu beginnen.",
    requires: "· Voraussetzung: ",
    researching: "Wird erforscht…",
    switchResearch: "Forschung wechseln (verwirft Fortschritt)",
    startResearch: "Forschung beginnen",
    status: {
      completed: "Erforscht",
      inProgress: "Läuft",
      available: "Verfügbar",
      locked: "Gesperrt",
    },
  },

  roster: {
    title: "Team",
    empty: "Keine Helden im Team.",
    max: " · MAX",
    xp: "EP",
    xpMaxLevel: (xp: number) => `${xp} (Höchststufe)`,
    fatigue: "Erschöpfung",
    fatigueLegend: (tired: number, exhausted: number) =>
      `Müde ≥ ${tired} (−1 auf alle Fertigkeiten) · Erschöpft ≥ ${exhausted} (nicht einsatzfähig)`,
    injuryChip: (name: string, days: number) => `${name} · ${days}T`,
    fatigueState: {
      fit: "Fit",
      tired: "Müde",
      exhausted: "Erschöpft",
    },
  },

  worldgate: {
    title: "Weltentor",
    squad: "Trupp",
    selectedCount: (n: number) => `${n} ausgewählt`,
    noMissions: "Keine Missionen verfügbar. Treibe die Forschung voran, um neue Fronten zu öffnen.",
    squadRange: (min: number, max: number) => `Trupp: ${min}${max !== min ? `–${max}` : ""} Einsatzkräfte`,
    deploySquad: "Trupp entsenden",
    launchMission: "Mission starten",
    selectFit: (min: number, max: number) =>
      `${min}${max !== min ? `–${max}` : ""} einsatzfähige Kräfte wählen`,
  },

  event: {
    missionComplete: "Mission abgeschlossen",
    noImmediateChange: "Keine unmittelbare Änderung.",
    teamCompositionHint: "Eine andere Teamzusammenstellung hätte vielleicht andere Wege eröffnet.",
    noActiveMission: "Keine aktive Mission.",
    outcomeAriaLabel: "Missionsausgang",
    narrativeAriaLabel: "Erzählung",
    // D-15: fallback shown on a locked option that carries no authored lockedReason.
    lockedGenericReason: "Gesperrt: Voraussetzung nicht erfüllt.",
    // D-13: word-by-word narration controls.
    textSpeedLabel: "Texttempo",
    textSpeedMode: { on: "An", fast: "Schnell", off: "Aus" } as Record<"on" | "fast" | "off", string>,
    skipHint: "Tippen, um den Text zu überspringen",
  },

  battle: {
    victory: "Sieg",
    defeat: "Niederlage",
    enemyPhase: "Gegnerische Phase",
    yourTurn: "Dein Zug",
    move: "Bewegen",
    selectAUnit: "Einheit wählen",
    interact: "Interagieren",
    cooldown: (n: number) => `AZ ${n}`,
    ap: (n: number) => `${n} AP`,
    hideLog: "Protokoll verbergen",
    log: "Protokoll",
    endTurn: "Zug beenden",
    stillActPrompt: (count: number) =>
      `${count} ${count === 1 ? "Einheit kann" : "Einheiten können"} noch handeln — Zug trotzdem beenden?`,
    cancel: "Abbrechen",
    endTurnAnyway: "Zug trotzdem beenden",
    noActiveBattle: "Kein aktiver Kampf.",
    squad: "Trupp",
    wounded: "Verwundet",
    hpAria: (hp: number, maxHp: number) => `${hp} von ${maxHp} TP`,
    results: "Ergebnisse",
    // objective / console feedback (battleModel.ts)
    round: (n: number) => `Runde ${n}`,
    consoleName: (letter: string) => `Konsole ${letter}`,
    consoles: (done: number, total: number) => `Konsolen ${done}/${total}`,
    enemiesLeft: (n: number) => `Verbleibende Gegner: ${n}`,
    surviveRounds: (done: number, rounds: number) => `Überstehe ${done}/${rounds} Runden`,
    zoneReached: "Zone erreicht",
    reachZone: "Zone erreichen",
    selectUnitFirst: "Zuerst eine Einheit wählen",
    activateFirst: (name: string) => `Zuerst ${name} aktivieren`,
    noApLeft: "Keine AP übrig",
    moveCloser: "Näher herangehen",
    alreadyActive: (name: string) => `${name} ist bereits aktiv`,
    noConsoleToActivate: "Keine Konsole zum Aktivieren",
  },
} as const;
