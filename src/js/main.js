// Import local modules
import { venueCapacities } from "./venues.js";
import { displayEvents } from "./displayEvents.js";
import { parseTimeString } from "./timeUtils.js";

const footballClubIdsByCity = {
  Manchester: ["133612", "133613"], // Manchester United, Manchester City
  London: ["133604", "133610", "133616", "133636", "133632", "133600", "133851"], // Arsenal, Chelsea, Spurs, West Ham, Crystal Palace, Fulham, Charlton
  Birmingham: ["133601", "133597"], // Aston Villa, Birmingham City
  Liverpool: ["133602", "133615"], // Liverpool, Everton
  Newcastle: ["134777"], // Newcastle United
  Leeds: ["133635"], // Leeds United
  Sheffield: ["133811", "133837"], // Sheffield United, Sheffield Wednesday
  Nottingham: ["133720"], // Nottingham Forest
  Leicester: ["133626"], // Leicester City
  Southampton: ["134778"], // Southampton
  Wolverhampton: ["133599"], // Wolverhampton Wanderers
  Sunderland: ["133603"], // Sunderland
  Glasgow: ["133647", "133642"], // Celtic, Rangers
  Edinburgh: ["133643", "133646"], // Hearts, Hibernian
  Cardiff: ["133637"], // Cardiff City
  Belfast: ["133964"], // Linfield
};

const venueNameAliases = {
  "hill dickinson stadium": "bramley moore dock stadium",
  "st andrews knighthead park": "st andrews",
  hillsborough: "hillsborough stadium",
  "nottingham arena": "city ground",
  "st james park newcastle": "st james park",
  "windsor park belfast": "windsor park",
};

// ========== 1. INITIALISATION ==========

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("dateInput");
  const timeInput = document.getElementById("timeInput");
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;

  // Date chips
  function offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  function nextWeekday(targetDay) {
    const now = new Date();
    const diff = (targetDay - now.getDay() + 7) % 7;
    const d = new Date();
    d.setDate(now.getDate() + diff);
    return d.toISOString().split("T")[0];
  }

  const chipDates = {
    today,
    tomorrow: offsetDate(1),
    sat: nextWeekday(6),
    sun: nextWeekday(0),
  };

  function syncDateChips() {
    const current = dateInput.value;
    document.querySelectorAll(".date-chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.value === current);
    });
  }

  document.querySelectorAll(".date-chip").forEach(btn => {
    btn.dataset.value = chipDates[btn.dataset.key];
    btn.addEventListener("click", () => {
      dateInput.value = btn.dataset.value;
      syncDateChips();
    });
  });

  dateInput.addEventListener("change", syncDateChips);
  syncDateChips();

  // Time chips
  function syncTimeChips() {
    const current = timeInput.value;
    document.querySelectorAll(".time-chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.time === current);
    });
  }

  document.querySelectorAll(".time-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      timeInput.value = btn.dataset.time;
      syncTimeChips();
    });
  });

  timeInput.addEventListener("change", syncTimeChips);
  syncTimeChips();

  // Attach listeners
  document
    .getElementById("inputButton")
    .addEventListener("click", handleSearchButton);
});

// ========== 2. HELPER FUNCTIONS ==========

// Reads user's time input and returns total minutes, or undefined if none
function getUserTimeInMins() {
  const timeInput = document.getElementById("timeInput");
  if (timeInput && timeInput.value) {
    return parseTimeString(timeInput.value);
  }
  return undefined;
}

// Called when the user presses the "Search" button or hits Enter
async function handleSearchButton() {
  const city = document.getElementById("citySelect").value;
  if (!city) {
    alert("Please select a city.");
    return;
  }

  const dateInput = document.getElementById("dateInput").value;
  if (!dateInput) {
    alert("Please select a date.");
    return;
  }

  const userTimeInMins = getUserTimeInMins();

  const [ticketmasterEvents, footballMatches] = await Promise.all([
    fetchTicketmasterEvents(city, dateInput),
    fetchFootballMatches(city, dateInput),
  ]);

  displayEvents(dedupeEvents([...ticketmasterEvents, ...footballMatches]), userTimeInMins);
}

function normaliseVenueName(name) {
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

function normaliseFootballMatch(match) {
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

function dedupeEvents(events) {
  const seenIds = new Set();
  const seenSlots = new Set();

  return events.filter((event) => {
    const venueId = event._embedded?.venues?.[0]?.id || "unknown-venue";
    const date = event.dates?.start?.localDate || "unknown-date";
    const time = event.dates?.start?.localTime || "unknown-time";
    const idKey = event.id;
    const slotKey = `${venueId}-${date}-${time}`;

    if ((idKey && seenIds.has(idKey)) || seenSlots.has(slotKey)) return false;
    if (idKey) seenIds.add(idKey);
    seenSlots.add(slotKey);
    return true;
  });
}

// ========== 3. TICKETMASTER FETCH ==========

async function fetchTicketmasterEvents(city, dateInput) {
  // Build start/end times from the chosen date
  const startDateTime = `${dateInput}T00:00:00Z`;
  const endDateTime = `${dateInput}T23:59:59Z`;

  // Ticketmaster API key & URL
  const tmApiKey = "6MeXOfGABChBThe1jaanIcv1kz7RbP4T";
  const tmApiUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmApiKey}&city=${city}&startDateTime=${startDateTime}&endDateTime=${endDateTime}`;

  try {
    const response = await fetch(tmApiUrl);
    if (!response.ok) throw new Error("Failed to fetch Ticketmaster events");

    const data = await response.json();
    console.log("Ticketmaster API Response:", data);

    if (data._embedded && data._embedded.events) {
      // Filter out events that don’t match the chosen date exactly
      return data._embedded.events.filter((event) => {
        return event.dates.start.localDate === dateInput;
      });
    }

    return [];
  } catch (error) {
    console.error("Error fetching Ticketmaster events:", error);
    return [];
  }
}

// ========== 4. FOOTBALL-DATA FETCH ==========

async function fetchFootballMatches(city, dateInput) {
  const clubIds = footballClubIdsByCity[city] || [];
  if (clubIds.length === 0) return [];

  const fixtureRequests = clubIds.map(async (clubId) => {
    const apiUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${clubId}`;
    const response = await fetch(apiUrl);
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

  return dedupeEvents(matchesOnSelectedDate.map(normaliseFootballMatch).filter(Boolean));
}
