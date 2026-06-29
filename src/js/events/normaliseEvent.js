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
          name: venueId ? venueCapacities[venueId]?.location || venueName : venueName,
        },
      ],
    },
  };
}
