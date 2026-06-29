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
const pageSize = "200";

function formatLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = formatLocalDateInputValue(new Date());
const end = new Date();
end.setDate(end.getDate() + 30);
const endDate = formatLocalDateInputValue(end);

for (const city of CITIES) {
  process.stdout.write(`Checking ${city}... `);
  const params = new URLSearchParams({
    apikey: API_KEY,
    city,
    startDateTime: `${today}T00:00:00Z`,
    endDateTime:   `${endDate}T23:59:59Z`,
    size: pageSize,
  });

  try {
    const events = [];
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages) {
      params.set("page", String(currentPage));
      const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
      if (!res.ok) {
        throw new Error(`Ticketmaster request failed: ${res.status}`);
      }

      const data = await res.json();
      events.push(...(data._embedded?.events ?? []));
      totalPages = data.page?.totalPages || 1;
      currentPage += 1;
    }

    let found = 0;
    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      if (venue?.id && !knownIds.has(venue.id) && !newVenues.has(venue.id)) {
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
    console.log(`  ${id}: { capacity: ???, location: ${JSON.stringify(name)} },`);
  }
}
