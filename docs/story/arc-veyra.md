<!--
FABLE-ÄNDERUNGEN — anzuwenden während der Content-Eingabe-Session M1–M5,
NICHT der Engine-Session aus §8. Hier festgehalten, damit der Kanon nicht
verloren geht; die Arc-Spezifikation unten ist wortwörtlich reproduziert.

1. Diese Datei ist die committete Spezifikation (erledigt).
2. Arc-Freischaltung: Füge { "type": "unlockMission", "mission": "m_vy_1" } zu
   den victoryEffects von m_relay hinzu. Erfinde KEINE neuen Bedingungstypen.
   (Zurückgestellt: die Verdrahtung vor der Existenz von m_vy_1 lässt die
   Content-Validierung fehlschlagen; wende sie in der Session an, die m_vy_1
   verfasst.)
3. Kanon, M3-Kampfpfad: Der Heimgetragene ist der Erste — Seryn Vael,
   verwundet. Rahme allen zugehörigen Text auf dieser These: ein Verräter an
   seinem Volk, der überläuft, um es von seinem falschen Gott zu befreien.
   Seine Rekrutierung auf dem Kampfpfad muss daran gekoppelt sein, dass die
   Variable doubt einen Schwellenwert erreicht, damit der Überlauf durch die
   Argumente des Spielers verdient und nicht durch den Sieg gewährt wird;
   falls die Spezifikation das bereits tut, behalte es bei.
4. M4–M5-Session (Plan-Aufgabe 6.2-A3; Fable-Resolutionen B–E) angewendet:
   - B: TechDef erhielt `visibleIf: Condition[]` (die einzige sanktionierte
     Schema-Änderung). t_radiance_cell an f_vy_godtech gekoppelt,
     t_projection_theory an f_vy_watched_god. Das Setzen der Arc-Flags macht
     die Techs sichtbar — es existiert kein separater unlockTech-Effekt und
     wird auch nicht benötigt.
   - M4 wurde als der **narrative Rückfall** aus ARC-D3 ausgeliefert, nicht
     taktisch: Das taktische Design benötigt Verstärkungswellen +
     flag-abhängige Kampf-Initialisierung (alarmierter Start bei
     f_vy_ilo_abandoned, Rückversetzung des Einsatzes bei f_vy_alarm, Seryns
     vordeaktivierter Pfeiler), die die Taktik-Engine nicht ausdrückt; sie
     hinzuzufügen wäre eine Änderung an der Taktik-Engine und liegt außerhalb
     des Rahmens dieser Content-Session. Die narrative Fassung ehrt jeden
     Flag-Beat und setzt identische Flags (f_vy_godtech, exotics +3,
     Freischaltung m_vy_5).
   - C: §6 Golden-Tests für den gesamten Arc auf die Zeit nach dem Balancing
     verschoben (hier ausgelassen).
   - Die 4-Achsen-Variation des M5-Epilogs ist in outcome-Labels je Ende +
     Journalzeilen eingefaltet (die Engine hat keine bedingte Textverkettung).
   - Die Warteschlange von ev_vy_dessik_word ist an die Ilo-befreien-Option
     von M2 gekoppelt (+5 Tage), die Symmetrie des gehaltenen Versprechens,
     die §5 verlangt.
6. D-10 (Umstrukturierung „Die verschlossene Tür", Fable-Session) ersetzt
   weitere Teile dieser Spezifikation; die Spezifikation unten bleibt
   wortwörtlich als Historie erhalten. Was sich geändert hat:
   - **Zwei Welten.** Der einzelne Planet der Prämisse ist aufgeteilt: Das
     Tal (Ankunft/Verzeichnis/Abfangen) ist **Andara**, Adresse 04; **Veyra**
     (Adresse 09) ist der Sitz des Gottes, einen Sprung weiter, und
     beherbergt jeden Schauplatz von m_vy_1..5. Bibel §10–§11 sind nun die
     Geographie-Autorität.
   - **Die verschlossene Tür.** Veyras Tor ist verwahrt — hinein frei, hinaus
     nur auf das Wort des Tempels. Dies ist der kanonische Grund, warum Recon
     One verstummte; der Tributruf (m_vy_intercept) ist der gestohlene Weg
     nach Hause. Aller Text auf der Veyra-Seite setzt dies voraus. Die
     mechanische Einsatzsperre wird in einer späteren Session ausgeliefert
     (f_vy_call_intercepted ist ihr Aufhänger).
   - **Die Portion / die Gesegneten.** Seryn wird durch die Segnung am
     Leben gehalten (Bibel §3); M3 liefert nun auf jedem Zweig eine erbeutete
     Dosis (`f_vy_sacrament_dose`), und das visibleIf von t_radiance_cell
     koppelt an any(dose, f_vy_godtech) — die reine f_vy_godtech-Kopplung aus
     §2.2 ist ersetzt. Sein Überlauf trägt einen Entzugsbogen (nur Text).
   - **Es existiert kein rivalisierendes Weltentor-Programm.** ev_first_contact,
     m_rival_stranded, trust_rival und das erneute Auslösen nach +30 Tagen
     sind vollständig gestrichen (Bibel §4 auf einen ruhenden Akt-2-Keim
     reduziert; Backlog B-1/B-3 gestrichen, B-8 reserviert). Der „Rechtliche
     Hinweis" aus §1 bleibt bestehen.
   - **Tal-Drama + Konvergenz.** Die Flucht der Ankunftsmission erhielt die
     Wahl mit dem fallenden Jungen (HIDE/RUN, `trust_andara` +2/0, Flags
     f_vy_boy_hidden/f_vy_boy_run) neben dem bestehenden gewaltsamen Zweig
     (trust_andara −3, vy_villager_killed beibehalten; vy_spare_address
     herausgefaltet). Alle drei Wege laufen auf dieselbe Veyra-Adresse
     zusammen, und der Junge und sein Vater werden auf Veyra in m_vy_1
     wiedererkannt (drei Varianten). Die Rettung in M2/M3 ist als Wiedersehen
     geschrieben (Recon-One-Besatzung benannt, Bibel §10).
5. D-9 (Umstrukturierung der frühen Kampagne, Fable-Session) ersetzt Teile
   dieser Spezifikation; die Spezifikation unten bleibt wortwörtlich als
   Historie erhalten. Was sich geändert hat:
   - „Zweite Expedition" wird überall in **Recon One** umbenannt (Story-Bibel
     §10): ein vierköpfiges Erkundungsteam, vor der Kampagne gefangen
     genommen; das addPersonnel +4 aus M3 ist kanonisch Recon One, das in den
     Dienst zurückkehrt.
   - Änderung 2 (Freischaltung m_relay → m_vy_1) ist UMGEKEHRT: m_vy_1
     schaltet sich nun aus den victoryEffects von m_vy_intercept frei. m_relay
     ist ein optionaler taktischer Nebenstrang (tech-gekoppelt, keine
     Hauptstrang-Freischaltung). Neuer Hauptstrang vor M1:
     ev_intro (automatischer Start bei newCampaign) → m_vy_arrival →
     m_vy_ledger → m_vy_intercept (taktisch) → m_vy_1.
   - M1s Eintrittsknoten ist neu geschrieben (der Spieler ist zu diesem
     Zeitpunkt bereits dreimal nach Veyra gesprungen — Ankunft, Verzeichnis,
     Abfangen; mehr bei Wiederholungen des Abfangens) und verzweigt auf
     f_vy_transport (Trägerpapiere von Karsu).
   - ev_first_contact vom Kampagnen-Hauptstrang zu m_rival_stranded verschoben
     („Notruf: Adresse 11"), freigeschaltet durch den Sieg bei m_vy_intercept.
-->

# Arc: Der Erleuchtete (Veyra) — Content-Spezifikation

Status: FABLE-VERFASST, bereit für die Content-Eingabe. Zieldateien: `src/data/content/events.json`, `missions.json`, `heroes.json`, `techs.json`, `maps.json` (+ kleine Schema-Ergänzung, §8).
Passt zu: D-3 (Verletzungen, kein Permadeath), D-5 (deterministische Erzählung), D-6 (Verzweigung-und-Engstelle), D-1 (versteckte gesperrte Optionen + Debrief-Hinweis).

---

## 0. Arc-Entscheidungsprotokoll

- **ARC-D1 (Standard):** Die Niederlage auf dem Sturmpfad von M2 ist narrativ geskriptet, keine taktische Schlacht. Begründung: Kosten (Karte + KI-Abstimmung) und Spielerfrust bei manipulierten Kämpfen. Alternative bei erneuter Prüfung: taktisches „Überlebe 3 Runden".
- **ARC-D2 (Standard):** Das Duell in M3 gegen den Ersten ist eine narrative Fertigkeitskonfrontation, nicht taktisch.
- **ARC-D3 (Standard):** Eine taktische Mission im Arc (M4), mit einem narrativen Rückfall-Knoten, falls Taktik-Engine/Karte zum Eintrittszeitpunkt nicht bereit sind.
- **ARC-D4 (Standard):** Der Schauplatz von M3 variiert je nach Pfad (Fluchtweg vs. Hinrichtungshof), damit die Entscheidungen aus M1/M2 nicht entwertet werden.
- **ARC-D5 (Standard):** Der Zeitpunkt von Seryns Rekrutierung ist pfadabhängig (M3, wenn überredet; nach M5, wenn besiegt und der Gott beobachtet wurde).

## 1. Prämisse

Planet **Veyra**: eine theokratische Gesellschaft, die **den Erleuchteten (Oru)** verehrt — in Wahrheit ein Überlebender einer Vorläuferspezies, der Projektions-/Exo-Schalen-Technologie nutzt, um göttlich zu erscheinen. Die **Zweite Expedition** von Worldgate (generisches Personal, keine Helden) wurde bei der Ankunft gefangen genommen und wird in der **Bußstätte** festgehalten, einem Basilika-Gefängnis. Der Vorkämpfer des Gottes ist **Seryn Vael, „die Erste Klinge"** — ein wahrer Gläubiger, kein Zyniker. Arc-Thema: Glaube vs. Beweise; jeder Pfad erschüttert die veyranische Orthodoxie auf andere Weise.

Rechtlicher Hinweis: alle Namen sind original; Ähnlichkeit nur auf Prämissen-/Genre-Ebene.

## 2. Content-Ergänzungen

### 2.1 Held (an heroes.json anhängen)

```json
{
  "id": "h_seryn",
  "name": "Seryn Vael",
  "archetypes": ["duelist"],
  "skills": { "combat": 7, "science": 1, "engineering": 1, "diplomacy": 4, "resolve": 6 },
  "bio": "First Blade of the Luminous One. Faith broken or bent — but the sword arm never wavered."
}
```

Falls das archetype-Enum geschlossen ist, füge entweder `"duelist"` zum Enum hinzu oder verwende `["soldier"]`; bevorzuge das Hinzufügen des Enum-Werts.
Seryn ist NICHT im Startaufgebot. Wird zur Laufzeit über den `addHero`-Effekt hinzugefügt (§8).

### 2.2 Techs (an techs.json anhängen)

```json
{
  "id": "t_radiance_cell",
  "name": "Radiance Cell",
  "description": "Reverse-engineered temple power core. Dense, stable, and not remotely holy.",
  "cost": 30,
  "prerequisites": [],
  "effects": [{ "type": "log", "text": "The 'holy fire' is a power cell. A very good one." }]
}
```

```json
{
  "id": "t_projection_theory",
  "name": "Projection Theory",
  "description": "Field recordings of the Luminous One reveal how a being can appear anywhere it is worshipped.",
  "cost": 45,
  "prerequisites": ["t_radiance_cell"],
  "effects": [{ "type": "log", "text": "Not omnipresence. Emitters." }]
}
```

Beide Techs sind **verborgen, bis sie freigeschaltet werden** durch Arc-Flags (siehe M4/M5). Falls die Tech-Liste keine Sichtbarkeitskopplung hat, koppele über `prerequisites` + ein Flag-Muster im Stil von `unlockTech`, das anderswo bereits verwendet wird; falls keines existiert, am einfachsten: Techs erscheinen nur dann in der Forschungs-UI, wenn eine Bedingung `flagSet` erfüllt ist — Implementierende: verwende dieselbe Kopplung wieder, die `unlockMission` nutzt; falls nichts existiert, füge `visibleIf: Condition[]` zum Tech-Schema hinzu (klein, Fable-genehmigt).

### 2.3 Verletzungen

Verwendet die bestehenden `inj_wounded`, `inj_shaken` wieder. Keine neuen Verletzungen.

### 2.4 Karte (taktisch, nur M4)

`map_temple_vault`, ~10×12: Eingangshalle (offen, niedrige Deckung), Kolonnaden-Flanken (halbe Deckung), inneres Gewölbe hinter **zwei Bann-Pfeiler-Interaktiva** (beide müssen deaktiviert werden, um die Gewölbetür zu öffnen; Interaktion = 1 AP, je ein Schritt). Wachen-Spawns: 5 Tempelwachen als Grundwert; +2 Verstärkungs-Spawn-Auslöser, siehe M4-Flag-Aufhänger. Verwende bestehende Einheitentypen, wo möglich, wieder; falls ein nahkampflastiger „Zelot"-Typ gewünscht ist, klone den nächstliegenden bestehenden Einheitentyp mit +Bewegung/−Reichweite — erfinde keine neuen Fähigkeiten.

## 3. Flags und Variablen

Alle Arc-Flags mit Präfix `f_vy_`. Alle deterministisch (D-5). Fertigkeitsproben = bestehende Kopplung der Erzähl-Engine (Schwellenwert auf der besten Fertigkeit im Trupp), kein RNG.

| Flag                  | Gesetzt in | Bedeutung / verbraucht von                                                                                                                                                                                                                                                                                                             |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| f_vy_intel_comms      | M1         | Abgefangene Tempel-Kommunikation (science). Schaltet den starken Pfad „Technik erklären" in M3 frei.                                                                                                                                                                                                                                   |
| f_vy_intel_patrols    | M1         | Patrouillen-Timing bekannt. Erleichtert Infiltrationsproben in M2.                                                                                                                                                                                                                                                                     |
| f_vy_intel_pilgrims   | M1         | Doktrin-Wissen. Schaltet den starken Pfad „überzeugen" in M3 frei.                                                                                                                                                                                                                                                                     |
| f_vy_approach_uniform | M1         | Wählte die Infiltration per Wachuniform. Verzweigt M2.                                                                                                                                                                                                                                                                                 |
| f_vy_approach_worker  | M1         | Wählte die Infiltration als Versorgungsarbeiter. Verzweigt M2.                                                                                                                                                                                                                                                                         |
| f_vy_approach_assault | M1         | Wählte den offenen Sturm. Verzweigt M2.                                                                                                                                                                                                                                                                                                |
| f_vy_uniform_knockout | M1         | Uniform durch Niederschlagen einer Wache erlangt.                                                                                                                                                                                                                                                                                      |
| f_vy_body_hidden      | M1         | Die Wache gut versteckt (Folgewahl). Abwesenheit + Niederschlagen ⇒ Komplikation in M2.                                                                                                                                                                                                                                                |
| f_vy_uniform_stolen   | M1         | Uniformen aus dem Badehaus erlangt (ohne Gewalt). Fehlende Rangsiegel ⇒ Herausforderung am inneren Tor in M2.                                                                                                                                                                                                                          |
| ~~f_vy_owe_ilo~~      | —          | ENTFERNT (Struktur-Session, D-15/Schwur-Streichung): Schwur-Mechanik gestrichen. Der alte Mann aus Andara bietet die Karren ohne Gegenleistung an; der Arbeiter-Pfad hängt nur noch an der Nicht-getötet-Route (`vy_villager_killed == false`). Die Ilo-Entscheidung in M2 (`f_vy_ilo_freed` / `f_vy_ilo_abandoned`) bleibt unberührt. |
| f_vy_captured         | M2         | Sturm gescheitert; Helden eingekerkert, Ausrüstung beschlagnahmt.                                                                                                                                                                                                                                                                      |
| f_vy_ilo_freed        | M2         | Das Versprechen gehalten.                                                                                                                                                                                                                                                                                                              |
| f_vy_ilo_abandoned    | M2         | Das Versprechen gebrochen. Folgen: Verrats-Ausgang in M2 + alarmierter Start in M4.                                                                                                                                                                                                                                                    |
| f_vy_alarm            | M2         | Die Flucht wurde laut (jeder Pfad). M3 beginnt mitten in der Verfolgung; kleiner Malus in M4.                                                                                                                                                                                                                                          |
| f_vy_first_convinced  | M3         | Seryn auf moralischer Grundlage zur Aufgabe bewogen.                                                                                                                                                                                                                                                                                   |
| f_vy_first_doubt      | M3         | Seryn mit dem technischen Argument erschüttert.                                                                                                                                                                                                                                                                                        |
| f_vy_first_defeated   | M3         | Seryn im Duell besiegt; er ist ein verwundeter Gefangener.                                                                                                                                                                                                                                                                             |
| f_vy_seryn_recruited  | M3 oder M5 | Seryn im Aufgebot (addHero ausgelöst).                                                                                                                                                                                                                                                                                                 |
| f_vy_expedition_freed | M2/M3      | Zweite Expedition gerettet (Engstelle — am Ende von M3 stets wahr).                                                                                                                                                                                                                                                                    |
| f_vy_godtech          | M4         | Gewölbe-Tech gesichert. Schaltet t_radiance_cell + M5 frei.                                                                                                                                                                                                                                                                            |
| f_vy_watched_god      | M5         | Beobachtet und aufgezeichnet. Schaltet t_projection_theory frei.                                                                                                                                                                                                                                                                       |
| f_vy_fought_god       | M5         | Angegriffen. Gott entkommt; Anker zerstört.                                                                                                                                                                                                                                                                                            |
| f_vy_anchor_destroyed | M5         | Veyra von der Gegenwart des Gottes befreit. +support, reiht ein Dankbarkeits-Event ein.                                                                                                                                                                                                                                                |

Variablen: `doubt` (int, 0–3). Je +1 aus Beweis-Beats im Stil von f_vy_intel_comms (unten markiert). Verbraucht in M3: Die Schwellenwerte für Gesprächserfolge sinken, wenn doubt steigt. Hält frühen optionalen Content mechanisch relevant.

## 4. Missions-Spezifikationen

Missionslisten-Eintrag: Der Arc schaltet jeweils eine sichtbare Mission auf einmal frei (`unlockMission`-Kette). Trupp: h_mercer + h_okafor **erforderlich** für M1–M3 (die Erzählung setzt beide Stimmen voraus). M4/M5 freie Truppauswahl, h_seryn auswählbar, falls rekrutiert.

---

### M1 — `m_vy_1` „Pilgerwege" (narrativ)

Freischaltung: Arc-Auslöser (bestehender Kampagnen-Aufhänger oder unmittelbar nach dem aktuellen Content; Implementierende: an das anhängen, was derzeit neue Missionen koppelt).
**Eintritt `n_arrive`:** Das Tor öffnet sich auf eine terrassierte heilige Stadt. Briefing-Text: die letzte Übertragung der Zweiten Expedition, seit 9 Tagen verstummt; das lokale Geraune sagt „Ketzer erwarten die Gnade der Bußstätte".
**`n_gather` (Hub, bis zu 2 von 3 wählen — als wieder aufsuchbarer Hub mit Einmal-Flags je Option umsetzen):**

- Unter den Pilgern lauschen [diplomacy ≥ 4] → f_vy_intel_pilgrims, doubt +0, Text sät Doktrin („Oru wandelt, wo er verehrt wird").
- Den Patrouillen folgen [combat ≥ 5] → f_vy_intel_patrols.
- Das Tempel-Relais anzapfen [science ≥ 6, Okafor-Zeile] → f_vy_intel_comms, **doubt +1** (verschlüsselter Burst-Verkehr — Götter brauchen keine Verschlüsselung).
  **`n_plan` (Entscheidungs-Hub):**

1. **Wachuniformen** → f_vy_approach_uniform → `n_uniform`
2. **Versorgungsarbeiter** → f_vy_approach_worker → `n_dessik`
3. **Offener Sturm** → f_vy_approach_assault → Missionsende (Text: Ihr kehrt durch das Tor zurück, um Waffen zu holen; unheilvoller Ton). Effekt: unlockMission m_vy_2.
   **`n_uniform`:**

- Eine einzelne Wache niederschlagen [combat ≥ 5] → f_vy_uniform_knockout → Folgewahl: sie in der Zisterne verstecken (f_vy_body_hidden) oder sie liegen lassen und sich schnell bewegen (kein Flag).
- Einen anderen Weg finden: Diebstahl im Badehaus während der Vigilstunde → f_vy_uniform_stolen (Text vermerkt die fehlenden Rangsiegel — sichtbarer Preis, D-2).
  Beide → Missionsende, unlockMission m_vy_2.
  **`n_dessik`:** (Struktur-Session, Schwur-Streichung) Der alte Mann aus Andara — der Vater des in M1 geretteten Jungen — bietet einen Platz zwischen den Getreidesäcken **ohne Gegenleistung** an; er schuldet Euch das für seinen Sohn, verlangt aber nichts. Annehmen → Missionsende, unlockMission m_vy_2. Ablehnen → zurück zu `n_plan`. Der Arbeiter-Pfad ist am `n_plan` nur noch an die Nicht-getötet-Route gegatet (`vy_villager_killed == false`, sichtbar gesperrt mit `lockedReason`, D-15); die frühere Schwur-Mechanik und `f_vy_owe_ilo` sind entfernt.
  Debrief-Hinweis (D-1): falls keine Intel-Flags gesetzt — „Die Einheimischen reden. Nächstes Mal sollte jemand zuhören, bevor der Plan gemacht wird."

---

### M2 — `m_vy_2` „Die Bußstätte" (narrativ, Router)

**`n_router`:** Bedingungen auf den approach-Flags → drei Zweige. Engstellen-Ziel: Endzustand = Konfrontation mit dem Ersten steht bevor, Expedition lokalisiert.

**Zweig A (Uniform), `a1_outer_gate`:**

- Falls f_vy_uniform_knockout und NICHT f_vy_body_hidden: Die Wache wurde gefunden; Tore in Alarmbereitschaft → erzwungene Komplikation: an einem misstrauischen Feldwebel vorbeireden [diplomacy ≥ 5] oder den Kontrollpunkt lautlos überwältigen [combat ≥ 6]; Scheitern beider verfügbarer Proben → f_vy_alarm.
- Falls f_vy_uniform_stolen: Siegel-Herausforderung am inneren Tor → als neue Versetzte bluffen [diplomacy ≥ 5, leichter mit f_vy_intel_pilgrims: Schwellenwert 4] oder durch den Beinhaus-Gang schlüpfen [f_vy_intel_patrols erforderlich].
  `a2_cells`: die Zweite Expedition ausfindig machen. Ausgangswahl: **leiser Weg** (langsam; Text-Spannung, kein Flag) vs. **Ablenkung am Glockenturm** (schnell, f_vy_alarm). So oder so → `n_bottleneck`.

**Zweig B (Arbeiter), `b1_kitchens`:** mit den Getreidekarren eintreten; die Essensrunden gewähren Zugang zum Zellenblock (Text: das Gefängnis läuft nach Ritual — vorhersehbar). Expedition ausfindig machen. **Ilo-Entscheidung** (auf diesem Zweig stets erreichbar; nach Streichung der Schwur-Mechanik nicht mehr an `f_vy_owe_ilo` gebunden — die Flags `f_vy_ilo_freed` / `f_vy_ilo_abandoned` funktionieren unverändert):

- Auch Ilo befreien → f_vy_ilo_freed; schwierigere Exfiltration: eine zusätzliche Probe [resolve ≥ 5] oder f_vy_alarm hinnehmen.
- Ihn zurücklassen → f_vy_ilo_abandoned → **unmittelbare Folge:** Dessik, der das Tor beobachtet, verrät es den Wachen; der Ausgang wird zu einem laufenden Gefecht: ein erforderlicher Held erhält inj_shaken, f_vy_alarm. (Gebrochene Versprechen beißen jetzt, nicht erst später.)
  → `n_bottleneck`.

**Zweig C (Sturm), `c1_assault` (ARC-D1 — geskriptet, nicht taktisch):** Drei Beats eskalierenden Textes; die Mauergeschütze sind Vorläufer-Tech, Schilde ignorieren Handfeuerwaffen. Es wird keine gewinnbare Option präsentiert; die beiden angebotenen Wahlmöglichkeiten („die Bresche stürmen" / „zum Tor zurückfallen") enden beide in Gefangennahme — die Rückfall-Variante erspart Verletzungen, die Sturm-Variante fügt einem Helden inj_wounded hinzu. Effekte: f_vy_captured, Text bestätigt beschlagnahmte Ausrüstung. Erwacht in den Zellen neben der Zweiten Expedition — die Rettung umgekehrt. → `n_bottleneck`.

**`n_bottleneck`:** Die Erste Klinge weiß Bescheid. Text variiert: (A/B) Alarmglocken oder stille Abriegelung, während Ihr die Gefangenen bewegt; (C) die Zellentüren öffnen sich im Morgengrauen — der Hof wartet. Missionsende. unlockMission m_vy_3.

---

### M3 — `m_vy_3` „Die Erste Klinge" (narrativ — ARC-D2)

**Eintrittsvarianten (Router auf Flags):**

- A/B-Pfade: Seryn und seine Ehrengarde stellen die Gruppe mitten in der Flucht im Prozessionshof.
- C-Pfad: Hinrichtungshof im Morgengrauen; Seryn verliest das Urteil: _„Ihr alle brennt bei Einbruch der Dämmerung. Oru ist gnädig — die Dämmerung ist Stunden entfernt."_
  So oder so dieselbe Kernszene (ARC-D4): An Seryn wird man nicht einfach vorbeigehen.

**`n_confront` (Entscheidung):**

1. **Überzeugen — moralisches Argument** („Ein Gott, der sich von Hinrichtungen nährt, verdient keine Erste Klinge.") Probe: diplomacy ≥ 7 − doubt; Schwellenwert −1 bei f_vy_intel_pilgrims (Ihr könnt ihm seine eigene Schrift zitieren). Erfolg → f_vy_first_convinced.
2. **Erklären — es gibt keinen Gott** (Okafor: Verschlüsselung, Energiesignaturen, Projektionsartefakte). Probe: science ≥ 7 − doubt; Schwellenwert −2 bei f_vy_intel_comms (Ihr habt die Aufzeichnungen). Erfolg → f_vy_first_doubt.
3. **Ihn bekämpfen.** → `n_duel`.
   **Scheitern von 1 oder 2** (Probe nicht erfüllt): Seryns Glaube verhärtet sich — automatische Verzweigung zu `n_duel` nach einem weiteren Wortwechsel. (Keine Sackgassen; Gesprächspfade riskieren die Verletzungskosten des Duells.)

**`n_duel`:** Strukturiertes narratives Duell in 3 Beats, deterministisch: Ausgang festgelegt (die Helden gewinnen — er ist ein Mann gegen ein Team und die befreite Expedition), die Kosten variieren nach der combat-Fertigkeit: bestes combat im Trupp ≥ 7 → Seryn erhält nur inj_wounded; < 7 → zusätzlich erhält ein Held inj_wounded. Effekte: f_vy_first_defeated, Verletzung h_seryn inj_wounded. Text: Ihr tragt die Erste Klinge auf einem Getreidekarren hinaus. Er dankt Euch nicht.

**`n_resolve`:**

- f_vy_first_convinced: Seryn befiehlt der Ehrengarde, abzulassen, und geht MIT Euch hinaus. Effekte: addHero h_seryn, f_vy_seryn_recruited. Sein Überlauf ist die lauteste denkbare Ketzerei — der Text vermerkt, dass die Stadt es nicht vergessen wird.
- f_vy_first_doubt: Seryn lässt Euch passieren und folgt, „um den Beweis mit eigenen Augen zu sehen." Effekte: addHero h_seryn, f_vy_seryn_recruited (mechanisch rekrutiert; der Text rahmt ihn als bedingt — zahlt sich in M5 aus).
- f_vy_first_defeated: Er ist ein Gefangener im Lazarett, noch kein Held (Rekrutierung möglich nach M5, ARC-D5).
  Alle: f_vy_expedition_freed, addPersonnel +4 (§8; Rückfall: intel +15 und Log-Text, falls der Effekt nicht ergänzt wurde), unlockMission m_vy_4. C-Pfad-Extra: Ausrüstung auf dem Weg hinaus aus der Sakristei geborgen (nur Text — es existiert kein mechanisches Ausrüstungssystem; erfinde keines).
  Debrief-Hinweis, falls das Duell stattfand, ohne dass Gesprächsoptionen je versucht wurden: „Er hörte einen Moment lang zu, vor den Schwertern. Wert, sich das zu merken."

---

### M4 — `m_vy_4` „Reliquiengewölbe" (taktisch; narrativer Rückfall gemäß ARC-D3)

Ziel: Vorläufer-Artefakte aus der Tempelrüstkammer erbeuten, um (a) die Forschung mit Material zu versorgen, (b) das Sanktum des Gottes zu lokalisieren.
**Taktische Fassung:** map_temple_vault. Ziel: beide Bann-Pfeiler (Interaktiva) deaktivieren, dann den Gewölberaum 1 Runde halten, während Okafor oder ein beliebiger Wissenschaftler-Archetyp den Kern extrahiert (drittes Interaktivum), dann Exfil-Zone. Feind: 5 Wachen; Verstärkungs-Auslöser (+2) in Runde 3 **oder** sofort beim Einsatz, falls f_vy_ilo_abandoned (Dessiks Tipp machte den Tempel paranoid — verzögerte Folge, D-2 versteckt). Falls f_vy_alarm: Der Spieler setzt eine Feldreihe weiter vom Ziel entfernt ein (gering). Falls f_vy_seryn_recruited und h_seryn im Trupp: Ein Bann-Pfeiler beginnt deaktiviert (er kennt die Riten).
**Narrativer Rückfall (falls Engine/Karte nicht bereit):** dieselben Beats als 5-Knoten-Event mit combat-/science-Proben; muss identische Flags setzen.
Ergebnis: f_vy_godtech, exotics +3, Freischaltung t_radiance_cell (sichtbar), unlockMission m_vy_5. Kampfunfähige Helden gemäß Standardbehandlung aus D-3.

---

### M5 — `m_vy_5` „Der Erleuchtete" (narrativ)

Eintritt: Der Gewölbekern resoniert mit einem Sanktum in der Caldera; das Team verfolgt es. **`n_witness`:** Der Gott manifestiert sich — eine hohe Gestalt aus Licht, umgeben von Maschinerie, die die Texte nie erwähnen. Falls Seryn anwesend (jeder Rekrutierungszustand inkl. als Zeuge mitgebrachter Gefangener — Implementierende: Bedingung auf f_vy_seryn_recruited ODER f_vy_first_defeated): ein Absatz, in dem er zusieht.

**`n_decide`:**

1. **Beobachten und aufzeichnen.** Effekte: f_vy_watched_god, Freischaltung t_projection_theory, intel +20. Das Wesen beendet seinen Ritus und geht; Ihr habt alles auf den Sensoren. Falls f_vy_first_doubt: Seryns Wandlung vollzieht sich (Text). Falls f_vy_first_defeated: Seryn, der vom Grat aus zusieht, bittet um ein Wort — **queueEvent ev_vy_seryn_oath, fireOnDay +2** → jenes Event: addHero h_seryn, f_vy_seryn_recruited.
2. **Angreifen.** Geskriptet: Das Wesen schirmt sich ab, steigt auf, springt durch ein Tor — **entkommt in jedem Fall** (festgelegt). Doch der Anker des Sanktums zerbirst im Schlagabtausch: f_vy_fought_god, f_vy_anchor_destroyed, Variable support +2, queueEvent ev_vy_gratitude (fireOnDay +3: der veyranische Übergangsrat sendet Tribut — funds +40, Log). Kosten: ein erforderlicher Held inj_shaken (vom Blick in jenes Licht), **kein t_projection_theory**, und falls f_vy_first_defeated: Seryn reißt sich im Chaos los, um seinen Gott zu schützen, und ist fort — Rekrut dauerhaft verloren (Text: er schuldete ihm einen Tod, wenn schon nichts anderes).
   Der Zielkonflikt ist ausdrücklich und exklusiv: **Wissenschaft (Tech + Seryn-auf-allen-Pfaden) vs. Politik (support + funds + eine befreite Welt)**.

**Epilog-Knoten:** variiert auf 4 Achsen (Vorgehen, Ilo, Seryn-Zustand, beobachten/kämpfen). Schreibe 1 kurzen Absatz je Achse, per Bedingung verkettet — keine kombinatorische Explosion (4 Slots, je 2–3 Varianten ≈ 10 Absätze).

## 5. Folge-Events (events.json)

- `ev_vy_seryn_oath` — wie oben (Rekrutierung auf dem Beobachten- + Besiegt-Pfad).
- `ev_vy_gratitude` — wie oben (Auszahlung des Kampfpfads).
- `ev_vy_dessik_word` — eingereiht (+5 Tage) falls f_vy_ilo_freed: Dessiks Schmugglernetzwerk speist Worldgate mit Aufklärungsdaten: intel +10, Log. (Gehaltene Versprechen zahlen sich ebenfalls spät aus — Symmetrie zum Verrat.)

## 6. Ergebnismatrix (für Tests)

Minimale Endzustände für Golden-Tests nach einem geskripteten Durchlauf des gesamten Arcs:

1. Uniform-Niederschlag-versteckt / überreden / beobachten → f_vy_seryn_recruited bei M3, t_projection_theory freigeschaltet, keine Arc-Verletzungen.
2. Arbeiter / Ilo zurücklassen / Duell / Gott bekämpfen → Seryn dauerhaft verloren, support +2, funds-Event eingereiht, ≥2 Verletzungen über den Arc hinweg erlitten, M4 alarmiert begonnen.
3. Sturm / erklären-mit-Comms / beobachten → f_vy_captured wahr, doubt ≥ 1, Rekrutierung bei M3, Expedition befreit.
   Assert: f_vy_expedition_freed in ALLEN Durchläufen wahr; genau eines von watched/fought gesetzt; die Missionskette schaltet strikt der Reihe nach frei.

## 7. Implementierungsaufgaben (sequenziell, je Session)

1. **[S] Schema + Validierung:** füge die Effekttypen `addHero` (+ optional `addPersonnel`) zur Effect-Union in schemas.ts hinzu; Interpreter-Fälle; Validator: `addHero` muss eine heroes.json-id referenzieren, die nicht bereits im Startaufgebot ist. Tests für beide. (§8)
2. **[S] Content-Eingabe M1–M3:** heroes.json (h_seryn), Events + Missionen für m_vy_1..3 exakt gemäß §4; Content-Validator ausführen; Handtest auf dem deployten Build.
3. **[S] Content-Eingabe M4–M5 + Folge-Inhalte:** Techs, m_vy_4 (zuerst narrativer Rückfall, falls 4.3 nicht gemergt; taktische Karte + Kampfdefinition, sobald doch), m_vy_5, §5-Events, §6-Golden-Tests.

## 8. Engine-Lücken (blockierend, klein)

- **`addHero`-Effekt** `{ type: "addHero", hero: Id }` → legt einen frischen HeroState (xp 0, level 1, fatigue 0, keine Verletzungen) für die gegebene hero-id an; No-op mit Warnung, falls bereits vorhanden.
- **`addPersonnel`-Effekt** `{ type: "addPersonnel", amount: int }` → personnel.total += amount. Optional; Rückfall in M3 dokumentiert.
- **Tech-Sichtbarkeitskopplung** — nur falls keine existiert; siehe §2.2.
  Keine weitere Engine-Arbeit erforderlich; alles Übrige verwendet das bestehende Effect/Condition-Vokabular. Falls eine hier referenzierte Bedingungs-/Proben-Syntax nicht exakt der Erzähl-Engine-Spezifikation entspricht, gewinnt die Spezifikation — bilde die Absicht ab, erweitere nicht die DSL.
