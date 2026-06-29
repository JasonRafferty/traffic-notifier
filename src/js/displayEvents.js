import { venueCapacities } from "./venues.js";
import { parseTimeString } from "./timeUtils.js";

function renderVerdict(events) {
  const verdictEl = document.getElementById("verdict");
  if (!verdictEl) return;

  if (!events || events.length === 0) {
    verdictEl.innerHTML = `<div class="verdict verdict-green"><span class="verdict-icon">✓</span><span class="verdict-text">No major events today — roads should be clear</span></div>`;
    return;
  }

  const totalCapacity = events.reduce((sum, event) => {
    const venueId = event._embedded?.venues?.[0]?.id;
    return sum + (venueCapacities[venueId]?.capacity || 0);
  }, 0);

  let level, icon, message;
  if (totalCapacity >= 60000) {
    level = "red";
    icon = "✕";
    message = "High traffic risk — avoid driving if possible";
  } else if (totalCapacity >= 20000) {
    level = "amber";
    icon = "⚠";
    message = "Some disruption likely — consider your timing";
  } else {
    level = "green";
    icon = "✓";
    message = "Low traffic risk — roads should be clear";
  }

  const crowdText = totalCapacity > 0
    ? `${events.length} event${events.length > 1 ? "s" : ""} today · ~${totalCapacity.toLocaleString()} people expected`
    : `${events.length} event${events.length > 1 ? "s" : ""} today`;

  verdictEl.innerHTML = `
    <div class="verdict verdict-${level}">
      <span class="verdict-icon">${icon}</span>
      <span class="verdict-text">${message}</span>
      <span class="verdict-sub">${crowdText}</span>
    </div>`;
}

export function displayEvents(events, userTimeInMins) {
  const venuesShown = 5; //This is how many venues shown, adjust if debug needed

  const eventsContainer = document.getElementById("events");
  eventsContainer.innerHTML = "";

  renderVerdict(events);

  if (!events || events.length === 0) {
    eventsContainer.innerHTML = "<p>No events found for that date.</p>";
    return;
  }

  let html = "<ul>";
  let shownCount = 0;

  events;
  events
    .sort((a, b) => {
      const capacityA =
        venueCapacities[a._embedded?.venues?.[0]?.id]?.capacity || 0;
      const capacityB =
        venueCapacities[b._embedded?.venues?.[0]?.id]?.capacity || 0;
      return capacityB - capacityA;
    })
    .slice(0, venuesShown) // How many venues are shown
    .forEach((event) => {
      const name = event.name || "Unnamed Event";
      const date = event.dates?.start?.localDate || "Unknown Date";
      const startTimeStr = event.dates?.start?.localTime || "00:00:00";
      const startTimeInMins = parseTimeString(startTimeStr.slice(0, 5));

      let endTimeStr = event.dates?.end?.localTime;
      let endTimeInMins;
      const venueId = event._embedded?.venues?.[0]?.id;
      const venueLocation =
        event._embedded?.venues?.[0]?.name || "Unknown Location";

      if (endTimeStr && endTimeStr !== "00:00:00") {
        endTimeInMins = parseTimeString(endTimeStr.slice(0, 5));
      } else {
        // Estimate durations based on type
        const venueDetails = venueCapacities[venueId];

        if (
          venueDetails?.type === "football" ||
          venueDetails?.type === "rugby"
        ) {
          endTimeInMins = startTimeInMins + 120; // ~2 hours
        } else if (venueDetails?.type === "cricket") {
          endTimeInMins = startTimeInMins + 180; // ~3 hours
        } else if (venueDetails?.type === "hockey") {
          endTimeInMins = startTimeInMins + 150; // ~2.5 hours
        } else {
          endTimeInMins = startTimeInMins + 180; // default 3 hours
        }
      }

      console.log(
        "Venue ID:",
        venueId,
        "Venue Name:",
        venueLocation,
        "Capacity:",
        venueCapacities[venueId]?.capacity
      );

      // Show only if userTimeInMins is undefined or event is in range
      let showThisEvent = true;
      if (typeof userTimeInMins === "number") {
        showThisEvent =
          userTimeInMins >= startTimeInMins - 60 &&
          userTimeInMins <= endTimeInMins + 60;
      }

      if (showThisEvent) {
        shownCount++;
        const capacity = venueCapacities[venueId]?.capacity;
        html += `
        <li>
          <strong>${venueLocation}</strong><br>
          Date: ${date.split("-").reverse().join("/")}<br>
          Starts: ${
            startTimeStr !== "00:00:00" ? startTimeStr.slice(0, 5) : "TBA"
          }<br>
          Estimated End: ${Math.floor(endTimeInMins / 60)
            .toString()
            .padStart(2, "0")}:${(endTimeInMins % 60)
          .toString()
          .padStart(2, "0")}<br>
          Capacity: ${capacity ? capacity.toLocaleString() : "Unknown"}
        </li>
      `;
      }
    });

  html += "</ul>";

  if (shownCount === 0) {
    eventsContainer.innerHTML = "<p>No events match your chosen time.</p>";
  } else {
    eventsContainer.innerHTML = html;
  }
}
