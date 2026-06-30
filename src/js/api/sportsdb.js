import { footballClubIdsByCity, footballHomeTeamsByCity } from "../data/footballClubs.js";
import { dedupeEvents } from "../events/dedupeEvents.js";
import { normaliseFootballMatch } from "../events/normaliseEvent.js";

function result(events, status = "success", message = "") {
  return { events, status, source: "TheSportsDB", message };
}

export async function fetchFootballMatches(city, dateInput) {
  const clubIds = footballClubIdsByCity[city] || [];
  if (clubIds.length === 0) return result([]);

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

  const homeTeams = new Set(footballHomeTeamsByCity[city] || []);
  const matchesOnSelectedDate = fixtures.filter((match) => {
    return match.dateEvent === dateInput && homeTeams.has(match.strHomeTeam);
  });

  if (import.meta.env.DEV) {
    console.info("[SportsDB] football fixtures", {
      city,
      selectedDate: dateInput,
      homeTeams: [...homeTeams],
      fetched: fixtures.map((match) => ({
        event: match.strEvent,
        date: match.dateEvent,
        time: match.strTime,
        venue: match.strVenue,
        homeTeam: match.strHomeTeam,
      })),
      matchingSelectedDate: matchesOnSelectedDate.length,
    });
  }

  const events = dedupeEvents(matchesOnSelectedDate.map(normaliseFootballMatch).filter(Boolean));
  const failedCount = results.filter((result) => result.status === "rejected").length;

  if (failedCount === 0) return result(events);
  if (failedCount === results.length) {
    return result([], "error", "Football fixtures could not be loaded.");
  }

  return result(events, "partial", "Some football fixtures could not be loaded.");
}
