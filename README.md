# Traffic Notifier

A browser-based tool that answers one question: **should I bother driving today?**

Large events — Premier League matches, concerts, rugby internationals — can turn a normal commute into a standstill. This app fetches events happening in a chosen city on a chosen date, sorts them by venue capacity, and tells you at a glance how bad traffic is likely to be and when to avoid the roads.

---

## How It Works

1. Pick a city from the dropdown and a date
2. Optionally set a time to filter events to only those happening around when you plan to drive
3. Hit Search — the app queries two APIs in parallel:
   - **Ticketmaster** — concerts, theatre, sport, and other ticketed events
   - **TheSportsDB** — football fixtures (currently Arsenal; expanding to full city → club mapping)
4. Results are sorted by venue capacity (largest first) and capped at the top 5
5. Each result shows: venue name, date, start time, estimated end time, and capacity

---

## Planned Features

### Red / Amber / Green Traffic Verdict

The core improvement. Instead of just listing events, the app will show a top-level verdict:

| Colour | Meaning | Trigger |
|--------|---------|---------|
| 🟢 Green | Drive freely | Total combined capacity under ~20,000 |
| 🟡 Amber | Some disruption likely | Total combined capacity 20,000–60,000, or multiple mid-sized events |
| 🔴 Red | Avoid if possible | Total combined capacity over 60,000, or several large events stacking up |

The score is based on **combined capacity across all events on the day**, not just the single biggest one. Two 30k-seat events score the same as one 60k event — both will clog the roads.

Below the verdict, the event breakdown remains visible so you can judge whether any of it actually affects your route or timing.

### Time-Aware Warnings

The app already supports optional time filtering (only show events within ±1 hour of your chosen time). The verdict will factor this in — if you're driving at 9am and all the events start at 7pm, the verdict can reflect that the risk is low for your specific window.

### City Dropdown + City → Club Mapping

The city input will become a dropdown of supported cities. This solves two problems:

1. Prevents silent failures when a city name doesn't match the football club lookup
2. Makes it clear upfront which cities the app covers

Each city in the dropdown will map to its relevant football clubs in TheSportsDB, so fixture data is fetched for the right teams — not just Arsenal. For example:

| City | Clubs |
|------|-------|
| Manchester | Man Utd, Man City |
| Liverpool | Liverpool, Everton |
| London | Arsenal, Chelsea, Spurs, West Ham, Crystal Palace, Fulham, Charlton |
| Birmingham | Aston Villa, Birmingham City |
| Newcastle | Newcastle United |
| Leeds | Leeds United |
| Nottingham | Nottingham Forest |
| Leicester | Leicester City |
| Glasgow | Celtic, Rangers |
| Cardiff | Cardiff City |
| Southampton | Southampton |
| Sheffield | Sheffield United, Sheffield Wednesday |
| Sunderland | Sunderland |
| Wolverhampton | Wolves |

---

## Project Structure

```
traffic-notifier/
├── index.html              # Single-page app shell
├── src/
│   ├── js/
│   │   ├── app.js          # Entry point — coordinates controls, fetches, scoring, rendering
│   │   ├── api/            # Ticketmaster and TheSportsDB fetchers
│   │   ├── data/           # City, venue, alias, and rush-hour profile data
│   │   ├── events/         # Event normalisation, deduping, and time-window logic
│   │   ├── traffic/        # Baseline traffic and verdict scoring
│   │   ├── ui/             # Controls, loading, verdict, and event renderers
│   │   └── utils/          # Shared time helpers
│   └── styles/
│       └── style.css
└── package.json
```

### Key Design Decisions

**data/venueCapacities.js** — Ticketmaster uses internal venue IDs (e.g. `KovZ9177z3V` = Old Trafford). The venues map translates these to human-readable names, capacities, and sport types. This is used both for display and for estimating event duration when the API doesn't provide an end time:

| Sport type | Estimated duration |
|---|---|
| Football / Rugby | 2 hours |
| Cricket | 3 hours |
| Hockey | 2.5 hours |
| Music / Theatre / Other | 3 hours |

**Sorting by capacity** — events are ranked largest-first because the biggest venues cause the most traffic impact. The app caps results at the top 5 by default (adjustable via `venuesShown` in `app.js`).

**Time window filtering** — if you enter a time, only events whose window (start − 1hr) to (end + 1hr) overlaps your chosen time are shown. The ±1hr buffer accounts for crowds arriving early and dispersing late.

---

## APIs Used

### Ticketmaster Discovery API
- Endpoint: `https://app.ticketmaster.com/discovery/v2/events.json`
- Filters by city and date range (full day: 00:00:00Z to 23:59:59Z)
- Returns events with venue IDs, start/end times, and embedded venue data
- Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

### TheSportsDB
- Endpoint: `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=TEAM_ID`
- Free tier (API v1) — no key required
- Returns upcoming fixtures for a given team ID
- Docs: https://www.thesportsdb.com/docs_api_examples
- City-to-club mappings live in `src/js/data/footballClubs.js`

---

## Running Locally

This is a Vite app. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a local `.env` file from `.env.example` and set:

```bash
VITE_TICKETMASTER_API_KEY=your_ticketmaster_api_key_here
```

> Note: Vite exposes `VITE_` variables to the browser bundle. This is fine for public browser keys, but a private key should be protected behind a proxy backend.

## Deployment

Pushes to `main` automatically build and deploy the app to GitHub Pages through `.github/workflows/deploy.yml`.

In the GitHub repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. After the first successful run, the app will be available from the GitHub Pages URL for this repository.

Set a GitHub Actions repository secret named `VITE_TICKETMASTER_API_KEY` so the Pages build includes Ticketmaster support.

---

## Venue Coverage

The app has hardcoded capacity data for major UK venues across:

**England:** Manchester, London, Birmingham, Liverpool, Newcastle, Sunderland, Leeds, Sheffield, Nottingham, Leicester, Southampton, Wolverhampton

**Scotland:** Glasgow, Edinburgh

**Wales:** Cardiff

**Northern Ireland:** Belfast

Venues without a matching entry in `data/venueCapacities.js` will still appear in results but will show "Unknown" capacity and fall back to a 3-hour duration estimate.
