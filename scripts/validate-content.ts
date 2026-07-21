/**
 * Validates src/data/content/*.json against schemas + referential integrity.
 * Run: npx tsx scripts/validate-content.ts   (wired into CI in task 0.1/0.3)
 * Exit code 1 on any error.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ContentBundle, type ContentBundleT } from "../src/data/schemas.js";

const dir = join(process.cwd(), "src/data/content");
const load = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

const errors: string[] = [];

// 1. Shape validation
const parsed = ContentBundle.safeParse({
  heroes: load("heroes.json"),
  injuries: load("injuries.json"),
  techs: load("techs.json"),
  abilities: load("abilities.json"),
  unitTypes: load("unit-types.json"),
  maps: load("maps.json"),
  events: load("events.json"),
  missions: load("missions.json"),
  facilities: load("facilities.json"),
});

if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    errors.push(`shape: ${issue.path.join(".")} — ${issue.message}`);
  }
  fail();
}
const c: ContentBundleT = parsed.data!;

// 2. Referential integrity
const ids = {
  heroes: new Set(c.heroes.map((h) => h.id)),
  techs: new Set(c.techs.map((t) => t.id)),
  abilities: new Set(c.abilities.map((a) => a.id)),
  maps: new Set(c.maps.map((m) => m.id)),
  events: new Set(c.events.map((e) => e.id)),
  missions: new Set(c.missions.map((m) => m.id)),
  injuries: new Set(c.injuries.map((i) => i.id)),
};

function checkEffects(where: string, effects: { type: string }[]) {
  for (const e of effects as any[]) {
    if (e.type === "queueEvent" && !ids.events.has(e.event))
      errors.push(`${where}: unknown event '${e.event}'`);
    if (e.type === "unlockMission" && !ids.missions.has(e.mission))
      errors.push(`${where}: unknown mission '${e.mission}'`);
    if (e.type === "injury" && !ids.injuries.has(e.injury))
      errors.push(`${where}: unknown injury '${e.injury}'`);
    if (e.type === "addHero" && !ids.heroes.has(e.hero)) errors.push(`${where}: unknown hero '${e.hero}'`);
  }
}
function checkConditions(where: string, conds: any[]) {
  for (const cond of conds) {
    if (cond.type === "techResearched" && !ids.techs.has(cond.tech))
      errors.push(`${where}: unknown tech '${cond.tech}'`);
    if (cond.type === "all" || cond.type === "any") checkConditions(where, cond.conditions);
    if (cond.type === "not") checkConditions(where, [cond.condition]);
  }
}

for (const t of c.techs) {
  for (const p of t.prerequisites)
    if (!ids.techs.has(p)) errors.push(`tech ${t.id}: unknown prerequisite '${p}'`);
  checkEffects(`tech ${t.id}`, t.effects);
  // Visibility gates use the universal Condition vocabulary (arc-veyra.md §2.2).
  checkConditions(`tech ${t.id} visibleIf`, t.visibleIf);
}
for (const u of c.unitTypes)
  for (const a of u.abilities)
    if (!ids.abilities.has(a)) errors.push(`unitType ${u.id}: unknown ability '${a}'`);

for (const m of c.maps) {
  if (m.tiles.length !== m.height)
    errors.push(`map ${m.id}: tiles rows ${m.tiles.length} != height ${m.height}`);
  m.tiles.forEach((row, y) => {
    if (row.length !== m.width) errors.push(`map ${m.id}: row ${y} length ${row.length} != width ${m.width}`);
    for (const ch of row) if (!".#-+".includes(ch)) errors.push(`map ${m.id}: row ${y} illegal tile '${ch}'`);
  });
  const inBounds = (p: { x: number; y: number }) => p.x < m.width && p.y < m.height;
  const unitTypeIds = new Set(c.unitTypes.map((u) => u.id));
  for (const p of m.squadSpawns) if (!inBounds(p)) errors.push(`map ${m.id}: spawn out of bounds`);
  for (const g of m.enemyGroups) {
    if (!unitTypeIds.has(g.unitType)) errors.push(`map ${m.id}: unknown unitType '${g.unitType}'`);
    for (const p of g.positions) if (!inBounds(p)) errors.push(`map ${m.id}: enemy spawn out of bounds`);
  }
  // Player-side allies (veyra-kaempfe spec §1a): unitType must resolve, spawn in
  // bounds, and their spawn conditions reference only known content.
  for (const a of m.allyUnits) {
    if (!unitTypeIds.has(a.unitType)) errors.push(`map ${m.id}: unknown allyUnit unitType '${a.unitType}'`);
    if (!inBounds(a.pos)) errors.push(`map ${m.id}: allyUnit spawn out of bounds`);
    checkConditions(`map ${m.id} allyUnit ${a.unitType}`, a.conditions);
  }
  const interactableIds = new Set(m.interactables.map((i) => i.id));
  for (const o of m.objectives) {
    if (o.kind === "interactSequence")
      for (const i of o.interactables)
        if (!interactableIds.has(i))
          errors.push(`map ${m.id}: objective ${o.id} unknown interactable '${i}'`);
    if (o.kind === "reachZone")
      for (const p of o.zone)
        if (!inBounds(p)) errors.push(`map ${m.id}: objective ${o.id} zone out of bounds`);
  }
}

for (const ev of c.events) {
  const nodeIds = new Set(ev.nodes.map((n) => n.id));
  const outcomeIds = new Set(ev.outcomes.map((o) => o.id));
  if (!nodeIds.has(ev.entryNode)) errors.push(`event ${ev.id}: entryNode '${ev.entryNode}' not found`);
  for (const n of ev.nodes)
    for (const o of n.options) {
      if (o.next.kind === "node" && !nodeIds.has(o.next.node))
        errors.push(`event ${ev.id}/${n.id}/${o.id}: unknown next node '${o.next.node}'`);
      if (o.next.kind === "end" && !outcomeIds.has(o.next.outcome))
        errors.push(`event ${ev.id}/${n.id}/${o.id}: unknown outcome '${o.next.outcome}'`);
      checkConditions(`event ${ev.id}/${n.id}/${o.id}`, o.requirements);
      checkEffects(`event ${ev.id}/${n.id}/${o.id}`, o.effects);
    }
  for (const o of ev.outcomes) checkEffects(`event ${ev.id}/outcome ${o.id}`, o.effects);
}

const mapById = new Map(c.maps.map((m) => [m.id, m]));
for (const m of c.missions) {
  if (m.payload.kind === "tactical" && !ids.maps.has(m.payload.map))
    errors.push(`mission ${m.id}: unknown map '${m.payload.map}'`);
  if (m.payload.kind === "narrative" && !ids.events.has(m.payload.eventScript))
    errors.push(`mission ${m.id}: unknown event '${m.payload.eventScript}'`);
  // tactics-engine spec §1: a tactical map must have at least as many
  // squadSpawns as the largest squad any mission can deploy onto it, so
  // battle init (§3) always has a spawn tile per hero.
  if (m.payload.kind === "tactical") {
    const map = mapById.get(m.payload.map);
    if (map && map.squadSpawns.length < m.squad.max)
      errors.push(
        `mission ${m.id}: map '${m.payload.map}' has ${map.squadSpawns.length} squadSpawns but squad.max is ${m.squad.max}`,
      );
  }
  checkConditions(`mission ${m.id}`, m.availability);
  checkEffects(`mission ${m.id}`, [...m.victoryEffects, ...m.defeatEffects]);
}

// facilities (facilities spec §5): prerequisite + effect refs checked with the
// same shared helpers as techs/events/missions.
for (const f of c.facilities) {
  checkConditions(`facility ${f.id}`, f.prerequisites);
  checkEffects(`facility ${f.id}`, f.effects);
}

function fail(): never {
  console.error(`Content validation FAILED (${errors.length} error${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

if (errors.length > 0) fail();
console.log(
  `Content OK: ${c.heroes.length} heroes, ${c.techs.length} techs, ${c.abilities.length} abilities, ` +
    `${c.unitTypes.length} unit types, ${c.maps.length} maps, ${c.events.length} events, ` +
    `${c.missions.length} missions, ${c.facilities.length} facilities.`,
);
