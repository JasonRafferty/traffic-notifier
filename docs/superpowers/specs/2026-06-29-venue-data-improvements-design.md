# Venue Data Improvements — Design Spec

_Date: 2026-06-29_

## Problem

`venueCapacities.js` is hard to maintain because it conflates two concerns:

1. **Venue capacity** — not exposed by either API; must be hardcoded manually. Unavoidable.
2. **Venue type** (football/music/cricket etc.) — already present in every Ticketmaster event under `classifications`. Stored redundantly in the static file for no benefit.

Additionally, TheSportsDB football matches are matched to venue IDs via fuzzy string matching (`normaliseEvent.js` → `venueAliases.js`), which is brittle and fails silently. Because we know the home team from every TheSportsDB fixture, a direct team-name → venue lookup is simpler and more reliable.

There is also no tooling to discover when new venue IDs appear in API responses, so the file falls out of date silently.

---

## Changes

### 1. Derive event type from `classifications` (not static venue data)

**Affected files:** `eventWindows.js`, `venueCapacities.js`, `normaliseEvent.js`

Every Ticketmaster event already includes:
```json
{
  "classifications": [
    { "segment": { "name": "Sports" }, "genre": { "name": "Soccer" } }
  ]
}
```

`addComputedEventWindow` in `eventWindows.js` will replace the `venueDetails?.type` switch with a `getEventDurationMins(event)` function that reads `classifications[0].genre.name` and `classifications[0].segment.name`. Genre takes precedence; segment is the catch-all for unrecognised sports.

Duration mapping:
| Genre (case-insensitive, substring) | Minutes |
|--------------------------------------|---------|
| soccer, football, rugby              | 120     |
| cricket                              | 180     |
| hockey                               | 150     |
| segment = "sports" (fallback)        | 120     |
| anything else                        | 180     |

TheSportsDB normalised events (currently have no `classifications`) will have this added in `normaliseFootballMatch`:
```js
classifications: [{ segment: { name: "Sports" }, genre: { name: "Football" } }]
```

`venueCapacities.js` loses the `type` field entirely — entries become `{ capacity, location }`.

---

### 2. Replace fuzzy venue matching with direct home team lookup

**Affected files:** `normaliseEvent.js`, new `homeGrounds.js`, deleted `venueAliases.js`

New file `src/js/data/homeGrounds.js` maps TheSportsDB `strHomeTeam` values directly to venue IDs:
```js
export const homeGrounds = {
  "Manchester United": "KovZ9177z3V",
  "Manchester City":   "KovZ9177YTX",
  "Arsenal":           "KovZ9177z6L",
  // ... all teams in footballClubs.js
};
```

`normaliseFootballMatch` replaces `findVenueIdByName(match.strVenue)` with `homeGrounds[match.strHomeTeam]`. If the team isn't in the map, the existing fallback ID (`sportsdb-<slug>`) still applies — no regression.

`findVenueIdByName`, `venueAliases.js`, and the `export` of `normaliseVenueName` are removed.

`normaliseVenueName` is also used by `buildFallbackVenueId` (for slugifying venue names into fallback IDs). It stays as a private, unexported helper — just no longer exported or used for fuzzy matching.

---

### 3. Add `scripts/update-venues.js` dev script

**New file:** `scripts/update-venues.js`

A Node.js script (run with `npm run update-venues`) that:
1. Queries Ticketmaster events for all 16 cities over the next 30 days
2. Collects every venue ID seen in responses
3. Cross-references against `venueCapacities.js`
4. Prints any unknown venue IDs with their names, formatted ready to paste into the file

`package.json` gets a new script: `"update-venues": "node scripts/update-venues.js"`

The script reads `VITE_TICKETMASTER_API_KEY` from `.env` using `dotenv`. If the key is missing, it exits with a clear error.

---

## Files Summary

| File | Action |
|------|--------|
| `src/js/data/venueCapacities.js` | Remove `type` field from all entries |
| `src/js/events/eventWindows.js` | Replace type-switch with classification-based duration |
| `src/js/events/normaliseEvent.js` | Use `homeGrounds` lookup; add `classifications` to output; remove fuzzy matching |
| `src/js/data/homeGrounds.js` | NEW — team name → venue ID |
| `src/js/data/venueAliases.js` | DELETE |
| `scripts/update-venues.js` | NEW — dev script to find unknown venue IDs |
| `package.json` | Add `update-venues` script |

---

## What Doesn't Change

- `venueCapacities.js` still exists and is still the source of truth for capacity and location name.
- `app.js` `sortByCapacity` is unaffected (uses `venueCapacities` directly, which still has `capacity`).
- TheSportsDB fallback venue IDs still work for teams not yet in `homeGrounds`.
- No UI changes.
