import { venueNameAliases } from "../data/venueAliases.js";
import { venueCapacities } from "../data/venueCapacities.js";

export function normaliseVenueName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findVenueIdByName(venueName) {
  const normalisedVenueName = normaliseVenueName(venueName);
  if (!normalisedVenueName) return undefined;

  const alias = venueNameAliases[normalisedVenueName];
  const targetName = alias || normalisedVenueName;
  const entries = Object.entries(venueCapacities);

  const exactMatch = entries.find(([, details]) => {
    return normaliseVenueName(details.location) === targetName;
  });
  if (exactMatch) return exactMatch[0];

  const partialMatch = entries.find(([, details]) => {
    const locationName = normaliseVenueName(details.location);
    return locationName.includes(targetName) || targetName.includes(locationName);
  });

  return partialMatch?.[0];
}

function normaliseSportsDbTime(time) {
  const timeMatch = time?.match(/\d{2}:\d{2}(?::\d{2})?/);
  if (!timeMatch) return "00:00:00";

  return timeMatch[0].length === 5 ? `${timeMatch[0]}:00` : timeMatch[0];
}

function buildFallbackVenueId(venueName, eventId) {
  const venueSlug = normaliseVenueName(venueName).replace(/\s+/g, "-");
  return `sportsdb-${venueSlug || eventId || "unknown-venue"}`;
}

export function normaliseFootballMatch(match) {
  if (!match?.dateEvent) return undefined;

  const venueName = match.strVenue || "Unknown Venue";
  const venueId = findVenueIdByName(venueName);
  const fallbackVenueId = buildFallbackVenueId(venueName, match.idEvent);
  const homeTeam = match.strHomeTeam || "Home team";
  const awayTeam = match.strAwayTeam || "Away team";

  return {
    id: match.idEvent ? `sportsdb-${match.idEvent}` : undefined,
    name: match.strEvent || `${homeTeam} vs ${awayTeam}`,
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
