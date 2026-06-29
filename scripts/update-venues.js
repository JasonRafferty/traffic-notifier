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
