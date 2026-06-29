# Traffic Notifier

A browser-based tool that answers one question: **should I bother driving today?**

Large events — Premier League matches, concerts, rugby internationals — can turn a normal commute into a standstill. This app fetches events happening in a chosen city on a chosen date, sorts them by venue capacity, and tells you at a glance how bad traffic is likely to be and when to avoid the roads.

---

## How It Works

1. Pick a city from the dropdown and a date
2. Optionally set a time to filter events to only those happening around when you plan to drive
3. Hit Search — the app queries two APIs in parallel:
   - **Ticketmaster** — concerts, theatre, sport, and other ticketed events
   - **TheSportsDB** — football fixtures for supported clubs in the selected city
4. Results are sorted by venue capacity (largest first) and capped at the top 5
5. Each result shows: venue name, date, start time, estimated end time, and capacity

---

## Core Features

### Red / Amber / Green Traffic Verdict

The app shows a top-level verdict before the event list:

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

The city input is a dropdown of supported cities. This solves two problems:

1. Prevents silent failures when a city name doesn't match the football club lookup
2. Makes it clear upfront which cities the app covers

Each city maps to its relevant football clubs in TheSportsDB. The app fetches upcoming fixtures for those teams, then keeps only fixtures where the home team belongs to the selected city. That prevents away games from polluting the wrong traffic result.

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
| Edinburgh | Hearts, Hibernian |
| Cardiff | Cardiff City |
| Southampton | Southampton |
| Sheffield | Sheffield United, Sheffield Wednesday |
| Sunderland | Sunderland |
| Wolverhampton | Wolves |
| Belfast | Linfield |

---

## Project Structure

```
traffic-notifier/
├── index.html              # Single-page app shell
├── src/
│   ├── js/
│   │   ├── app.js          # Entry point — coordinates controls, fetches, scoring, rendering
│   │   ├── api/            # Ticketmaster and TheSportsDB fetchers
│   │   ├── data/           # City, venue, home-ground, and rush-hour profile data
│   │   ├── events/         # Event normalisation, deduping, and time-window logic
│   │   ├── traffic/        # Baseline traffic and verdict scoring
│   │   ├── ui/             # Controls, loading, verdict, and event renderers
│   │   └── utils/          # Shared time helpers
│   └── styles/
│       └── style.css
└── package.json
```

### Key Design Decisions

**data/venueCapacities.js** — Ticketmaster uses internal venue IDs (e.g. `KovZ9177z3V` = Old Trafford). The venues map translates those IDs to a display name and an estimated capacity:

```js
KovZ9177z3V: { capacity: 74310, location: "Old Trafford" }
```

The capacity is used for the traffic score and for sorting the event list. The location is used when the app normalises football fixtures from TheSportsDB into the same shape as Ticketmaster events.

**data/homeGrounds.js** — TheSportsDB football fixtures tell us the home team. Instead of fuzzy-matching a venue name string, the app maps the home team directly to the Ticketmaster venue ID:

```js
"Manchester United": "KovZ9177z3V"
```

This makes football capacity scoring more reliable, because a home fixture resolves to the same venue ID used everywhere else in the app.

**Event classifications** — Event duration is estimated from `event.classifications`, not from the static venue data. Ticketmaster already returns classifications, and TheSportsDB football matches are normalised with:

```js
classifications: [{ segment: { name: "Sports" }, genre: { name: "Football" } }]
```

When an event has no explicit end time, the fallback durations are:

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
- Fetches every available page for that city/date, using the maximum page size
- Returns events with venue IDs, start/end times, and embedded venue data
- Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

### TheSportsDB
- Endpoint: `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=TEAM_ID`
- Free tier (API v1) — no key required
- Returns upcoming fixtures for a given team ID
- The app filters those fixtures by selected date and selected city's home teams
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

To check whether Ticketmaster is returning venue IDs that are missing from the local capacity table, run:

```bash
npm run update-venues
```

The script checks the supported cities, walks every Ticketmaster result page, and prints unknown venues in a paste-ready format for `src/js/data/venueCapacities.js`.

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

Venues without a matching entry in `data/venueCapacities.js` can still appear in results, but they will not contribute capacity to the traffic score until they are added. Event duration still comes from the event classification when available; if an event has no useful classification and no end time, it falls back to the generic 3-hour estimate.
