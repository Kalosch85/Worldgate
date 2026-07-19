/**
 * Browser content loader (task 2.1). Mirrors scripts/validate-content.ts and
 * src/test/content.ts, but for the app bundle: Vite inlines the JSON at build
 * time, so no node:fs — this stays browser-safe (ARCHITECTURE §1). Content is
 * validated through the same zod bundle, so a malformed edit fails loudly.
 */
import abilities from "./content/abilities.json";
import events from "./content/events.json";
import facilities from "./content/facilities.json";
import heroes from "./content/heroes.json";
import injuries from "./content/injuries.json";
import maps from "./content/maps.json";
import missions from "./content/missions.json";
import techs from "./content/techs.json";
import unitTypes from "./content/unit-types.json";
import { ContentBundle, type ContentBundleT } from "./schemas.js";

let cached: ContentBundleT | null = null;

/** Parse and cache the content bundle. Throws (ZodError) on invalid content. */
export function loadContent(): ContentBundleT {
  if (cached) return cached;
  cached = ContentBundle.parse({
    heroes,
    injuries,
    techs,
    abilities,
    unitTypes,
    maps,
    events,
    missions,
    facilities,
  });
  return cached;
}
