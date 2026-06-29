# Venue Data Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `type` field from `venueCapacities.js`, derive event duration from Ticketmaster's `classifications`, replace brittle fuzzy venue name matching with a direct team→venue lookup, delete the now-dead alias file, and add a dev script to surface unknown venue IDs.

**Architecture:** Event duration is computed from `event.classifications[0].genre/segment` (already in the API response) rather than a hardcoded `type` field on the venue. TheSportsDB football matches are resolved to venue IDs via a new `homeGrounds.js` map keyed on `strHomeTeam` (always known) rather than fuzzy matching on `strVenue` (unreliable).

**Tech Stack:** Vanilla JS ES modules, Vite 8, Node.js (for the dev script — `--env-file` flag requires Node 20.6+).

## Global Constraints

- No new runtime dependencies — use only what is already in `package.json`.
- All source files use ES module `import`/`export` syntax (`"type": "module"` is set in `package.json`).
- No TypeScript — plain `.js` throughout.
- The dev script (`scripts/update-venues.js`) runs in Node.js directly, not through Vite. It must not use `import.meta.env` — use `process.env` instead.
- No test framework exists in the project. Each task uses manual verification via the Vite dev server (`npm run dev`) instead of automated tests.

---

### Task 1: Create `homeGrounds.js`

Maps TheSportsDB `strHomeTeam` strings to Ticketmaster venue IDs from `venueCapacities.js`. Teams whose venues are not in `venueCapacities.js` are simply omitted — the existing fallback ID path handles them.

**Files:**
- Create: `src/js/data/homeGrounds.js`

**Interfaces:**
- Produces: `homeGrounds` — `Record<string, string>` where key = TheSportsDB team name, value = Ticketmaster venue ID key in `venueCapacities`.

- [ ] **Step 1: Create the file**

```js
// src/js/data/homeGrounds.js
export const homeGrounds = {
  // Manchester
  "Manchester United":        "KovZ9177z3V",
  "Manchester City":          "KovZ9177YTX",

  // London
  "Arsenal":                  "KovZ9177z6L",
  "Chelsea":                  "KovZ9177z1y",
  "Tottenham Hotspur":        "KovZ9177z3C",
  "West Ham United":          "KovZ9177z6g",
  "Crystal Palace":           "KovZ9177z5X",
  "Fulham":                   "KovZ9177z4X",
  "Queens Park Rangers":      "KovZ9177z8p",

  // Birmingham
  "Aston Villa":              "KovZ9177z9c",
  "Birmingham City":          "KovZ9177z9B",

  // Liverpool
  "Liverpool":                "KovZ9177z6t",
  "Everton":                  "KovZ9177z6u",

  // Newcastle
  "Newcastle United":         "KovZ9177z8n",

  // Sunderland
  "Sunderland":               "KovZ9177z8y",

  // Leeds
  "Leeds United":             "KovZ9177z9x",

  // Sheffield
  "Sheffield United":         "KovZ9177z4d",
  "Sheffield Wednesday":      "KovZ9177z4s",

  // Nottingham
  "Nottingham Forest":        "KovZ9177z3b",

  // Leicester
  "Leicester City":           "KovZ9177z2f",

  // Southampton
  "Southampton":              "KovZ9177z2h",

  // Wolverhampton
  "Wolverhampton Wanderers":  "KovZ9177z2j",

  // Glasgow
  "Celtic":                   "KovZ9177z9r",
  "Rangers":                  "KovZ9177z9t",

  // Cardiff
  "Cardiff City":             "KovZ9177z9A",
};
```

- [ ] **Step 2: Verify the file imports cleanly**

Start the dev server and open the browser console. No import errors should appear:

```bash
npm run dev
```

Open http://localhost:5173, open DevTools → Console. Should be no errors on load.

- [ ] **Step 3: Commit**

```bash
git add src/js/data/homeGrounds.js
git commit -m "feat: add homeGrounds team-to-venue-id map"
```

---

### Task 2: Update `normaliseEvent.js` — use homeGrounds, add classifications, remove fuzzy matching

Replaces the fragile `findVenueIdByName(match.strVenue)` call with a direct `homeGrounds[match.strHomeTeam]` lookup. Adds `classifications` to the normalised event shape so downstream code can derive event type from it. Removes the export of `normaliseVenueName` (it stays private for the fallback ID slug).

**Files:**
- Modify: `src/js/events/normaliseEvent.js`

**Interfaces:**
- Consumes: `homeGrounds` from `../data/homeGrounds.js` (Task 1)
- Consumes: `venueCapacities` from `../data/venueCapacities.js` (existing)
- Produces: normalised football match object now includes `classifications: [{ segment: { name: "Sports" }, genre: { name: "Football" } }]`

- [ ] **Step 1: Rewrite `normaliseEvent.js`**

Replace the entire file with:

```js
import { homeGrounds } from "../data/homeGrounds.js";
import { venueCapacities } from "../data/venueCapacities.js";

function venueNameToSlug(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+/g, "-");
}

function buildFallbackVenueId(venueName, eventId) {
  const slug = venueNameToSlug(venueName);
  return `sportsdb-${slug || eventId || "unknown-venue"}`;
}

function normaliseSportsDbTime(time) {
  const timeMatch = time?.match(/\d{2}:\d{2}(?::\d{2})?/);
  if (!timeMatch) return "00:00:00";
  return timeMatch[0].length === 5 ? `${timeMatch[0]}:00` : timeMatch[0];
}

export function normaliseFootballMatch(match) {
  if (!match?.dateEvent) return undefined;

  const venueName = match.strVenue || "Unknown Venue";
  const venueId = homeGrounds[match.strHomeTeam];
  const fallbackVenueId = buildFallbackVenueId(venueName, match.idEvent);
  const homeTeam = match.strHomeTeam || "Home team";
  const awayTeam = match.strAwayTeam || "Away team";

  if (!venueId) {
    console.warn(`[normaliseEvent] No venue mapped for home team: "${match.strHomeTeam}" — using fallback ID`);
  }

  return {
    id: match.idEvent ? `sportsdb-${match.idEvent}` : undefined,
    name: match.strEvent || `${homeTeam} vs ${awayTeam}`,
    classifications: [{ segment: { name: "Sports" }, genre: { name: "Football" } }],
    dates: {
      start: {
        localDate: match.dateEvent,
        localTime: normaliseSportsDbTime(match.strTime),
      },
    },
    _embedded: {
      venues: [
        {
          id: venueId || fallbackVenueId,
          name: venueId ? venueCapacities[venueId].location : venueName,
        },
      ],
    },
  };
}
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Search for a city with a football team (e.g. Manchester, any upcoming date). Open DevTools → Console:
- Should see no import errors.
- If a team has no entry in `homeGrounds`, you'll see a `[normaliseEvent] No venue mapped for home team: "..."` warning — that's expected and correct.
- Football events should still appear in results with venue names.

- [ ] **Step 3: Commit**

```bash
git add src/js/events/normaliseEvent.js
git commit -m "refactor: replace fuzzy venue matching with homeGrounds direct lookup"
```

---

### Task 3: Update `eventWindows.js` — derive duration from `classifications`

Replaces the `venueDetails?.type` switch with a `getEventDurationMins(event)` function that reads `event.classifications`. Football/rugby → 120 min, cricket → 180 min, hockey → 150 min, any other sport → 120 min, everything else → 180 min.

**Files:**
- Modify: `src/js/events/eventWindows.js`

**Interfaces:**
- Consumes: `event.classifications[0].genre.name` and `event.classifications[0].segment.name` (strings, may be absent)
- `venueDetails` in `_computed` now only provides `capacity` and `location` (no `type` — removed in Task 4, but this task must not read `type` regardless)

- [ ] **Step 1: Rewrite `eventWindows.js`**

Replace the entire file with:

```js
import { venueCapacities } from "../data/venueCapacities.js";
import { parseTimeString } from "../utils/timeUtils.js";

function getEventDurationMins(event) {
  const genre = (event.classifications?.[0]?.genre?.name ?? "").toLowerCase();
  const segment = (event.classifications?.[0]?.segment?.name ?? "").toLowerCase();

  if (genre.includes("soccer") || genre.includes("football") || genre.includes("rugby")) return 120;
  if (genre.includes("cricket")) return 180;
  if (genre.includes("hockey")) return 150;
  if (segment === "sports") return 120;
  return 180;
}

export function addComputedEventWindow(event) {
  const startTimeStr = event.dates?.start?.localTime || "00:00:00";
  const startTimeInMins = parseTimeString(startTimeStr.slice(0, 5));
  const venueId = event._embedded?.venues?.[0]?.id;
  const venueDetails = venueCapacities[venueId];

  const endTimeStr = event.dates?.end?.localTime;
  const endTimeInMins =
    endTimeStr && endTimeStr !== "00:00:00"
      ? parseTimeString(endTimeStr.slice(0, 5))
      : startTimeInMins + getEventDurationMins(event);

  return {
    ...event,
    _computed: { startTimeInMins, endTimeInMins, startTimeStr, venueDetails },
  };
}

export function overlapsUserTime(event, userTimeInMins) {
  if (typeof userTimeInMins !== "number") return true;

  const { startTimeInMins, endTimeInMins } = event._computed;
  return userTimeInMins >= startTimeInMins - 60 && userTimeInMins <= endTimeInMins + 60;
}
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Search for Manchester on a day with a football match. Expand an event card — the time window shown should reflect a 2-hour duration for football, not 3.

Search for a music event city (e.g. London). Expand an event card — non-sport events should show a 3-hour window.

Open DevTools → Console — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/js/events/eventWindows.js
git commit -m "refactor: derive event duration from classifications instead of venue type"
```

---

### Task 4: Strip `type` from `venueCapacities.js`

`type` is no longer read anywhere in the codebase after Tasks 2–3. Remove it from all entries, leaving `{ capacity, location }` per venue ID.

**Files:**
- Modify: `src/js/data/venueCapacities.js`

- [ ] **Step 1: Confirm `type` is no longer imported/used**

```bash
grep -rn "venueDetails\.type\|\.type.*football\|\.type.*music\|\.type.*cricket\|\.type.*rugby\|\.type.*hockey\|\.type.*theatre" src/
```

Expected output: no matches.

- [ ] **Step 2: Remove `type` from every entry in `venueCapacities.js`**

The full updated file (replace entirely):

```js
export const venueCapacities = {
  // Manchester
  KovZ9177z3V: { capacity: 74310, location: "Old Trafford" },
  KovZ9177YTX: { capacity: 53400, location: "Etihad Stadium" },
  KovZ9177A4f: { capacity: 21000, location: "AO Arena" },
  KovZ9177z31: { capacity: 26000, location: "Emirates Old Trafford" },
  KovZ9177z3P: { capacity: 23000, location: "Co-op Live Manchester" },
  KovZ9177z1f: { capacity: 23000, location: "Co-op Live Manchester" },
  KovZpZAnFvdA: { capacity: 260,   location: "Deaf Institute" },
  KovZpZA6kvtA: { capacity: 11770, location: "SNHU Arena" },

  // London
  KovZ9177z1e: { capacity: 90000, location: "Wembley Stadium" },
  KovZ9177z5f: { capacity: 82000, location: "Twickenham Stadium" },
  KovZ9177z6g: { capacity: 62500, location: "London Stadium" },
  KovZ9177z3C: { capacity: 60260, location: "Tottenham Hotspur Stadium" },
  KovZ9177z6L: { capacity: 60260, location: "Emirates Stadium" },
  KovZ9177z1y: { capacity: 41500, location: "Stamford Bridge" },
  KovZ9177z7g: { capacity: 25000, location: "The O2 Arena" },
  KovZ9177z8p: { capacity: 25000, location: "The Valley" },
  KovZ9177z4X: { capacity: 40000, location: "Craven Cottage" },
  KovZ9177z5X: { capacity: 30500, location: "Selhurst Park" },
  KovZ9177gU0: { capacity: 1400,  location: "Palace Theatre" },
  KovZ9177yOV: { capacity: 12500, location: "OVO Arena, Wembley" },
  KovZ9177E07: { capacity: 1570,  location: "ABBA Arena" },
  KovZ9177nD0: { capacity: 2100,  location: "Lyceum Theatre" },
  KovZ9177B9V: { capacity: 1500,  location: "Adelphi Theatre" },
  KovZ9177Ue7: { capacity: 1150,  location: "Savoy Theatre" },
  KovZ9177UqV: { capacity: 1012,  location: "Phoenix Theatre" },
  KovZ9177U3f: { capacity: 967,   location: "Lyric Theatre" },
  KovZ9177Uvf: { capacity: 1500,  location: "Sadler's Wells" },
  KovZ9177HfV: { capacity: 312,   location: "The Other Palace" },
  KovZ9177H_f: { capacity: 2000,  location: "Troubadour Wembley Park Theatre" },
  KovZ9177LL7: { capacity: 340,   location: "Sam Wanamaker Playhouse" },
  KovZ9177VPf: { capacity: 479,   location: "Duchess Theatre" },
  KovZ917AIfG: { capacity: 9271,  location: "Brisbane Road Stadium" },
  KovZ9177V00: { capacity: 800,   location: "The Lightroom" },
  KovZpa8kCe:  { capacity: 10200, location: "Canada Life Place" },

  // Birmingham
  KovZ9177z9c: { capacity: 42785, location: "Villa Park" },
  KovZ9177z9B: { capacity: 30016, location: "St Andrew's" },
  KovZ9177z7n: { capacity: 30016, location: "Edgbaston Cricket Ground" },
  KovZ9177z7Y: { capacity: 30000, location: "Alexander Stadium" },

  // Liverpool
  KovZ9177z6t: { capacity: 53394, location: "Anfield" },
  KovZ9177z6u: { capacity: 39000, location: "Goodison Park" },
  KovZ9177z6V: { capacity: 54074, location: "Bramley-Moore Dock Stadium" },

  // Newcastle
  KovZ9177z8n: { capacity: 52305, location: "St James' Park" },
  KovZ9177z8M: { capacity: 36500, location: "Kingston Park Stadium" },

  // Sunderland
  KovZ9177z8y: { capacity: 49000, location: "Stadium of Light" },

  // Cardiff
  KovZ9177z9q: { capacity: 74500, location: "Principality Stadium" },
  KovZ9177z9A: { capacity: 33280, location: "Cardiff City Stadium" },

  // Glasgow
  KovZ9177z9r: { capacity: 60411, location: "Celtic Park" },
  KovZ9177z9s: { capacity: 51866, location: "Hampden Park" },
  KovZ9177z9t: { capacity: 50817, location: "Ibrox Stadium" },
  KovZ9177z9G: { capacity: 25000, location: "The SSE Hydro" },

  // Leeds
  KovZ9177z9x: { capacity: 37890, location: "Elland Road" },
  KovZ9177z9Y: { capacity: 23000, location: "Headingley Cricket Ground" },

  // Sheffield
  KovZ9177z4d: { capacity: 32702, location: "Bramall Lane" },
  KovZ9177z4s: { capacity: 39732, location: "Hillsborough Stadium" },
  KovZ9177z4P: { capacity: 28500, location: "Sheffield Hallam Stadium" },

  // Edinburgh
  KovZ9177z9E: { capacity: 67800, location: "Murrayfield Stadium" },

  // Nottingham
  KovZ9177z3b: { capacity: 30445, location: "City Ground" },
  KovZ9177z3R: { capacity: 21000, location: "Trent Bridge Cricket Ground" },

  // Leicester
  KovZ9177z2f: { capacity: 32273, location: "King Power Stadium" },
  KovZ9177z2T: { capacity: 25000, location: "Welford Road Stadium" },

  // Southampton
  KovZ9177z2h: { capacity: 32384, location: "St Mary's Stadium" },
  KovZ9177z2S: { capacity: 25000, location: "The Ageas Bowl" },

  // Wolverhampton
  KovZ9177z2j: { capacity: 32050, location: "Molineux Stadium" },

  // Belfast
  KovZ9177zNI: { capacity: 32000, location: "Kingspan Stadium" },
};
```

- [ ] **Step 3: Verify no `type` references remain**

```bash
grep -n "type:" src/js/data/venueCapacities.js
```

Expected output: no matches.

- [ ] **Step 4: Start dev server and do a quick search**

```bash
npm run dev
```

Search any city. Results should render normally — no console errors about missing `type`.

- [ ] **Step 5: Commit**

```bash
git add src/js/data/venueCapacities.js
git commit -m "refactor: remove type field from venueCapacities — now derived from classifications"
```

---

### Task 5: Delete `venueAliases.js`

Nothing imports it after Task 2. Safe to delete.

**Files:**
- Delete: `src/js/data/venueAliases.js`

- [ ] **Step 1: Confirm nothing imports it**

```bash
grep -rn "venueAliases" src/
```

Expected output: no matches.

- [ ] **Step 2: Delete the file**

```bash
rm src/js/data/venueAliases.js
```

- [ ] **Step 3: Verify the dev server still starts cleanly**

```bash
npm run dev
```

Open http://localhost:5173 — no console errors. Search any city.

- [ ] **Step 4: Commit**

```bash
git add -u src/js/data/venueAliases.js
git commit -m "chore: delete venueAliases.js — superseded by homeGrounds direct lookup"
```

---

### Task 6: Add `scripts/update-venues.js` dev script

A Node.js script that queries Ticketmaster for all 16 cities over the next 30 days, collects every venue ID seen, cross-references against `venueCapacities.js`, and prints unknown IDs formatted for pasting into the file.

**Files:**
- Create: `scripts/update-venues.js`
- Modify: `package.json` (add script entry)

**Interfaces:**
- Reads: `VITE_TICKETMASTER_API_KEY` from environment (loaded via `node --env-file=.env`)
- Reads: `venueCapacities` from `../src/js/data/venueCapacities.js`
- Outputs: formatted console output of unknown venue IDs

- [ ] **Step 1: Create `scripts/update-venues.js`**

```js
// Run: npm run update-venues
// Finds Ticketmaster venue IDs not yet in venueCapacities.js

import { venueCapacities } from "../src/js/data/venueCapacities.js";

const API_KEY = process.env.VITE_TICKETMASTER_API_KEY;
if (!API_KEY) {
  console.error("Error: VITE_TICKETMASTER_API_KEY not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const CITIES = [
  "Manchester", "London", "Birmingham", "Liverpool", "Newcastle",
  "Leeds", "Sheffield", "Nottingham", "Leicester", "Southampton",
  "Wolverhampton", "Sunderland", "Glasgow", "Edinburgh", "Cardiff", "Belfast",
];

const knownIds = new Set(Object.keys(venueCapacities));
const newVenues = new Map();

const today = new Date().toISOString().split("T")[0];
const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

for (const city of CITIES) {
  process.stdout.write(`Checking ${city}... `);
  const params = new URLSearchParams({
    apikey: API_KEY,
    city,
    startDateTime: `${today}T00:00:00Z`,
    endDateTime:   `${endDate}T23:59:59Z`,
    size: "200",
  });

  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    if (!res.ok) {
      console.log(`skipped (${res.status})`);
      continue;
    }
    const data = await res.json();
    const events = data._embedded?.events ?? [];
    let found = 0;
    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      if (venue?.id && !knownIds.has(venue.id)) {
        newVenues.set(venue.id, venue.name ?? "Unknown");
        found++;
      }
    }
    console.log(`${events.length} events, ${found} new venue(s)`);
  } catch (err) {
    console.log(`error: ${err.message}`);
  }
}

if (newVenues.size === 0) {
  console.log("\nAll venues already known. venueCapacities.js is up to date.");
} else {
  console.log(`\nFound ${newVenues.size} unknown venue(s). Add to venueCapacities.js:\n`);
  for (const [id, name] of newVenues) {
    console.log(`  ${id}: { capacity: ???, location: "${name}" },`);
  }
}
```

- [ ] **Step 2: Add the npm script to `package.json`**

In `package.json`, update the `"scripts"` block:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "update-venues": "node --env-file=.env scripts/update-venues.js"
},
```

- [ ] **Step 3: Verify the script runs**

```bash
npm run update-venues
```

Expected: the script prints each city with event counts, then lists any unknown venue IDs (or says everything is up to date). It should not throw errors. If the API key is missing, it should print a clear message and exit 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/update-venues.js package.json
git commit -m "feat: add update-venues script to surface unknown Ticketmaster venue IDs"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All three spec requirements have tasks — classification-based duration (Task 3), homeGrounds lookup (Tasks 1–2), update-venues script (Task 6). Deletion of venueAliases.js (Task 5) and stripping `type` (Task 4) are included.
- [x] **No placeholders:** All code blocks are complete.
- [x] **Type consistency:** `homeGrounds` is `Record<string, string>` (venue ID string), consumed in Task 2 as `homeGrounds[match.strHomeTeam]` which returns `string | undefined` — consistent. `venueCapacities[venueId].location` used in Task 2, `venueCapacities[venueId].capacity` used implicitly in `_computed.venueDetails` — both still present after Task 4.
- [x] **venueNameToSlug** — renamed from `normaliseVenueName` in Task 2, no other tasks reference the old name.
- [x] **Order dependency:** Tasks must run in order 1→2→3→4→5→6. Task 2 imports homeGrounds (Task 1). Task 4 removes `type` only after Task 3 stops reading it.
