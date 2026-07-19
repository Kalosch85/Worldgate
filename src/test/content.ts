/**
 * Test-only content loader — mirrors scripts/validate-content.ts. Lives
 * outside src/core so core stays free of node:fs (ARCHITECTURE §1).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ContentBundle, type ContentBundleT } from "../data/schemas.js";

const dir = join(process.cwd(), "src/data/content");
const load = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

export function loadTestContent(): ContentBundleT {
  return ContentBundle.parse({
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
}
