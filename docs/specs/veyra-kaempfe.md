# Spec: Veyra-Kämpfe & Deployment (Fable) — v2.0

> **Leitplanke (T)-Werte (Tuning v3 §6):** (T)-Werte werden nur mit
> gleichzeitiger Aktualisierung dieser Spec geändert; Spec und Content dürfen
> nicht divergieren.

## 1. Sanktionierte Schema-Änderungen (exakt diese, keine weiteren)

a) `TacticalMapDef` erhält:

```ts
allyUnits: z.array(z.object({
  unitType: Id, pos: Pos,
  conditions: z.array(ConditionSchema).default([]),
})).default([]),
```

Semantik: Bei Battle-Init wird jede allyUnit als player-seitige Einheit
gespawnt, wenn ihre conditions erfüllt sind (leere = immer). Spielergesteuert
wie Helden.

b) `MissionDef` erhält:

```ts
operation: Id.optional(),
retryOnDefeat: z.boolean().default(false),
```

c) `GameState` erhält:

```ts
deployment: z.object({ operation: Id, squad: z.array(Id) }).nullable(),
```

Initial null. Property-Test-Generator erweitern.

d) Neuer Effekt: `{ type: "endDeployment" }` — setzt deployment auf null.

## 2. Deployment-Regeln (Operation „vy")

- launchMission einer Mission mit `operation`-Feld bei deployment == null:
  Squad wird gewählt wie üblich, danach `deployment = { operation, squad }`.
- Weitere Missionen derselben Operation: Squad-Auswahl entfällt, es wird
  deployment.squad verwendet. Die Exhausted-Sperre (Fatigue ≥ 80) gilt
  innerhalb eines laufenden Deployments NICHT — das Team muss weiter,
  müde oder nicht. Verletzte nehmen teil (mit Mali).
- endDay-Recovery (Fatigue/Injuries) überspringt Helden in deployment.squad.
- Missionen mit `retryOnDefeat: true` werden bei Niederlage NICHT aus
  available entfernt; defeatEffects werden angewandt, die Mission bleibt
  wiederholbar.
- Worldgate-UI zeigt während eines Deployments einen Hinweis
  „Team im Einsatz — Rückkehr erst nach Abschluss der Operation" und
  bietet nur Missionen der laufenden Operation an.
- Alle Veyra-Bogen-Missionen (Tal/arrival, intercept, ledger,
  pilgrim_roads/penitence/first_blade-Kette, breakout, Heimkehr) erhalten
  `operation: "vy"`.

## 2a. Direkter Missionsübergang im Deployment

Der Missions-Summary-Screen (narrativ wie taktisch) erhält einen
Primär-Button „Weiter: [Missionsname]", wenn (a) ein Deployment aktiv ist
und (b) durch die soeben abgeschlossene Mission genau EINE neue Mission
derselben Operation freigeschaltet wurde. Der Button dispatcht
launchMission direkt mit deployment.squad — kein Wechsel zur Basis, keine
Squad-Auswahl. Bei mehreren oder null neuen Operations-Missionen:
bisheriges Verhalten (Rückkehr zur Basis-Ansicht). Das Worldgate bleibt
als Fallback immer funktionsfähig, auch wenn der Summary geschlossen
wurde. Außerhalb eines Deployments ändert sich nichts.

## 3. Neuer Gegnertyp

`ut_tender_guard` (Wächter-Drohne): maxHp 4, aim 60, mobility 5,
damage { min: 1, max: 2 }, abilities ["ab_stab"]. (Alle Werte T.)
`ab_stab`: apCost 1, range 1, targeting enemy, power 2, cooldown 0. (T)
Anzeigename „Wächter-Drohne"; nutzt das vorhandene Insekten-Billboard.
Charakter: reine Nahkampf-Rusher — die vorhandene Utility-KI erzeugt das
gewünschte Verhalten von selbst (Annäherung dominiert, kein Deckungsspiel
nötig; NICHT die KI-Konstanten global ändern).

**Balance-Rebase v3** (ersetzt den aim-48-Workaround aus PR #41; autorisierte
Fable-Entscheidung): `ut_tender_guard` aim **48 → 60** — die Wächter-Drohne wird
wieder bedrohlich (Nahkampf ohne Deckung: 60 − 2×1 = ~58 %). Gleichzeitig
Helden-Basis-Genauigkeit `HERO_AIM_BASE` **55 → 60** (tactics-engine §2; Formel
bleibt `60 + 5 × effCombat`) — Helden fühlen sich kompetenter an. Beide Werte
sind (T) und leben in `src/core/tacticsConstants.ts` bzw.
`src/data/content/unit-types.json`; diese Spec und der Content sind hiermit
synchron (siehe Leitplanke oben).

## 4. Seryn als bedingter Mitstreiter

`ut_seryn_blessed`: maxHp 7, aim 75, mobility 5, damage { min: 1, max: 2 },
abilities ["ab_blade"]. (T) `ab_blade`: apCost 1, range 1, targeting enemy,
power 3, cooldown 0. (T) Anzeigename „Seryn". Platzhalter-Darstellung bis
Sprite geliefert wird.
Spawn nur auf map_vy_breakout via allyUnits mit conditions:
`[{ type: "any", conditions: [ { type:"flag", flag:"f_vy_first_convinced",
value:true }, { type:"flag", flag:"f_vy_first_doubt", value:true } ] }]`
(Exakte Flag-Namen gegen events.json verifizieren, ggf. angleichen.)

## 5. Kampf 1 — m_vy_intercept „Die Signaltürme"

Einbau: zwischen Tal-Mission und Bußstätten-Kette — der Outcome-Effekt, der
bisher die Folgemission nach dem Tal freischaltet, schaltet stattdessen
m_vy_intercept frei; dessen victoryEffects schalten die bisherige
Folgemission frei. Nichts anderes an der Kette ändern.
Missionstext: „Der Tempel meldet jede Störung über seine Signaltürme durch
das Tor. Bevor ihr die Bußstätte betretet, muss der Tributruf schweigen."
Karte `map_vy_intercept` (12×10, Legende wie map_relay; zur Spielbarkeit
±2 Tiles/Deckungen erlaubt, Layout-Charakter erhalten):

```
............
..-...##...+
......##..A.
.-..........
....##...-..
....##......
..+.......-.
S...........
S...-.....B.
S...........
```

Interactables: con_spire_a an Position A, con_spire_b an Position B
(exakte Koordinaten aus dem Raster ableiten). kind bleibt "console",
Anzeigename „Signalturm". Objective: interactSequence
[con_spire_a, con_spire_b]. Kein eliminateAll — beide Türme aktiviert =
Sieg, auch mit lebenden Drohnen.
Gegner: 4× ut_tender_guard, verteilt zwischen den Türmen. Squad 2–4.
victoryEffects: xp squad 15, fatigue squad +15, flag f_vy_signal_jammed,
log: „Okafor, über den offenen Tributruf: ‚Keine Verschlüsselung. Götter
brauchen keine Verschlüsselung.'"
defeatEffects: fatigue squad +20, log „Rückzug von den Türmen." —
retryOnDefeat: true.

## 6. Kampf 2 — m_vy_breakout „Der Ausbruch"

Einbau (ändert D-16-Struktur, ausdrücklich sanktioniert): Das Exfil-ENDE
(Heimkehr-Knoten „Der Übergang, ein letztes Mal…") wird aus
ev_vy_first_blade herausgelöst in ein neues Event ev_vy_homecoming
(Mission m_vy_home, narrativ, operation "vy", Squad = deployment).
ev_vy_first_blade endet nach dem Exfil-ÜBERGANG mit unlockMission
m_vy_breakout. m_vy_breakout victoryEffects: unlockMission m_vy_home,
xp squad 20, fatigue squad +20. Der Outcome von ev_vy_homecoming trägt
zusätzlich den Effekt { type: "endDeployment" }.
Missionstext: „Die menschlichen Wachen weichen zurück — manche fliehen,
manche zögern. Nur die Drohnen kommen. Drohnen kennen keinen Zweifel."
Karte `map_vy_breakout` (12×10; Start = Zellentrakt links, Ziel = Torhof
rechts; zwei Engstellen; Anpassung wie oben erlaubt):

```
.....#......
.S...#..-...
.S...#......
.S....+...ZZ
.S...#....ZZ
.....#....ZZ
..-..#......
.....##.#...
....-...#.+.
............
```

Z = reachZone-Zellen (Torhof). Gegner: 6× ut_tender_guard, gestaffelt
(2 nahe Mitte, 2 an der zweiten Engstelle, 2 im Torhof-Vorfeld).
Objective: reachZone. Sanktionierte Semantik-Festlegung: reachZone gilt als
erfüllt, wenn ALLE lebenden (nicht ausgeschalteten) Spieler-Einheiten in
der Zone stehen. Verifiziere, dass kein bestehender Content reachZone
bereits nutzt; falls doch, eskalieren statt umdefinieren.
retryOnDefeat: true; defeatEffects: fatigue squad +20, injury
randomSquadMember inj_shaken, log „Zurückgeschlagen in die Zellen."

## 7. Squad-Größe der Operation

Die Tal-/Erstmission der Operation setzt min 2 / max 4. Mit Seryn im
Breakout kämpfen also maximal 5 Einheiten gegen 6 Drohnen; ohne ihn 4
gegen 6 — absichtlich härter (Belohnung der Überzeugen-Route), aber
schaffbar (siehe §8).

**v3-Nachtrag: Spielerfalle „Unterbesetzte Operation" (empfohlene
Teamstärke, KEIN harter min-3-Gate).** Deployment-Sperre plus Retry-Fatigue
macht 2er-Operationen zur Spirale (die Exhausted-Sperre entfällt im
laufenden Deployment, Fatigue steigt monoton, und ein verlorener Kampf
verletzt zusätzlich). Ursprünglich als `squad.min 3` geplant — bei der
Umsetzung zeigte sich jedoch ein **Softlock**: der Startkader umfasst nur
zwei Helden (Mercer, Okafor), und der einzige weitere Held (Seryn) tritt
erst tief in derselben Operation bei (`ev_vy_first_blade`, nach
`m_vy_arrival`). Ein harter min 3 macht die Erstmission — den Hauptstrang —
unstartbar. Daher bleibt `m_vy_arrival` bei min 2, und die Falle wird über
eine **Empfehlung** geschlossen: die Squad-Auswahl-UI zeigt bei jeder
Mission mit `operation`-Feld den Hinweis „Operation ohne Rückkehr —
empfohlene Teamstärke: 4". Ein echter min-3-Gate erfordert vorher einen
dritten früh verfügbaren Held (Content/Kanon-Aufgabe, Fable-Tier).

## 8. Pflicht-Verifikation (headless, Ergebnisse in den PR)

1. Intercept mit 2er-Squad (Mercer+Okafor, frisch) und mit 4er-Squad:
   je ein geskriptetes Siegs-Szenario und ein Niederlagen-Szenario.
2. Breakout MIT Seryn und OHNE Seryn: je ein Siegs-Szenario mit
   plausibler Taktik (Engstellen halten, gestaffelt vorrücken); ohne
   Seryn darf es eng sein, nicht unmöglich.
3. Deployment-Kette End-to-End über die echten Reducer: Tal starten
   (Deployment beginnt) → intercept → ledger/penitence/first_blade →
   breakout → Heimkehr (endDeployment) → Erholung greift wieder;
   Fatigue-Verlauf im Test dokumentieren.
4. Übergänge (§2a): narrativ→taktisch (first_blade→breakout) und
   taktisch→narrativ (breakout→Heimkehr) je einmal End-to-End über die
   echten Reducer per „Weiter"-Button-Pfad; Fallback über das Worldgate
   ebenfalls einmal.
5. Retry-Pfad: Breakout verlieren → Mission weiter verfügbar → gewinnen.
6. Golden-Battle-Test von map_relay bleibt UNVERÄNDERT grün.

## 9. Nicht-Ziele

Keine menschlichen Gegner, keine Gesegneten als Feinde (Akt 2), keine
Wellen/Reinforcements, keine neuen KI-Modi, keine Overwatch, keine
Träger-Drohnen als Neutrale, keine Änderung an map_relay.
