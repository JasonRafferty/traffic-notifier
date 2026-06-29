// Import local modules
import { venueCapacities } from "./venues.js";
import { displayEvents } from "./displayEvents.js";
import { parseTimeString } from "./timeUtils.js";

// ========== 1. INITIALISATION ==========

document.addEventListener("DOMContentLoaded", () => {
  // Set the date input to today's date
  const dateInput = document.getElementById("dateInput");
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  dateInput.value = today;

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
function handleSearchButton() {
  //Call both APIS
  fetchTicketmasterEvents();
  fetchFootballMatches(); //https://www.thesportsdb.com/docs_api_examples
}

// ========== 3. TICKETMASTER FETCH ==========

async function fetchTicketmasterEvents() {
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
      const filteredEvents = data._embedded.events.filter((event) => {
        return event.dates.start.localDate === dateInput;
      });
      displayEvents(filteredEvents, userTimeInMins);
    } else {
      displayEvents([], userTimeInMins);
    }
  } catch (error) {
    console.error("Error fetching Ticketmaster events:", error);
    displayEvents([], undefined);
  }
}

// ========== 4. FOOTBALL-DATA FETCH ==========

async function fetchFootballMatches() {
  // 1. Get the user-chosen date from your existing date input
  const dateInput = document.getElementById("dateInput").value; // "YYYY-MM-DD"

  // 2. TheSportsDB endpoint for upcoming Arsenal matches
  const apiUrl = "https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=133604";

  try {
    // 3. Fetch the data
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // 4. Parse the JSON
    const data = await response.json();
    console.log("Raw TheSportsDB Data:", data);

    // 5. Check if events exist
    if (data.events && data.events.length > 0) {
      // 6. Filter matches by user-chosen date
      const filteredEvents = data.events.filter(event => event.dateEvent === dateInput);

      // 7. Log the results
      if (filteredEvents.length > 0) {
        filteredEvents.forEach(event => {
          console.log(`Match Date: ${event.dateEvent}, Stadium: ${event.strVenue}`);
        });
      } else {
        console.log("No matches found on that date.");
      }
    } else {
      console.log("No upcoming events found for Arsenal.");
    }
  } catch (error) {
    console.error("Unable to fetch data:", error);
  }
}