import { footballClubIdsByCity } from "../data/footballClubs.js";
import { dedupeEvents } from "../events/dedupeEvents.js";
import { normaliseFootballMatch } from "../events/normaliseEvent.js";

export async function fetchFootballMatches(city, dateInput) {
  const clubIds = footballClubIdsByCity[city] || [];
  if (clubIds.length === 0) return [];

  const fixtureRequests = clubIds.map(async (clubId) => {
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${clubId}`);
    if (!response.ok) {
      throw new Error(`TheSportsDB request failed for team ${clubId}: ${response.status}`);
    }

    const data = await response.json();
    return data.events || [];
  });

  const results = await Promise.allSettled(fixtureRequests);
  const fixtures = results.flatMap((result) => {
    if (result.status === "fulfilled") return result.value;
    return [];
  });

  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => console.error("Unable to fetch football fixtures:", result.reason));

  const matchesOnSelectedDate = fixtures.filter((match) => match.dateEvent === dateInput);
  if (import.meta.env.DEV) {
    console.info("[SportsDB] football fixtures", {
      city,
      selectedDate: dateInput,
      fetched: fixtures.map((match) => ({
        event: match.strEvent,
        date: match.dateEvent,
        time: match.strTime,
        venue: match.strVenue,
      })),
      matchingSelectedDate: matchesOnSelectedDate.length,
    });
  }

  return dedupeEvents(matchesOnSelectedDate.map(normaliseFootballMatch).filter(Boolean));
}
