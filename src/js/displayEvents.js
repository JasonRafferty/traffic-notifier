import { createIcons, MapPin, Clock, Users } from 'lucide';
import { venueCapacities } from "./venues.js";
import { parseTimeString } from "./timeUtils.js";

function renderVerdict(events) {
  const verdictEl = document.getElementById("verdict");
  if (!verdictEl) return;

  const totalCapacity = (events || []).reduce((sum, event) => {
    const venueId = event._embedded?.venues?.[0]?.id;
    return sum + (venueCapacities[venueId]?.capacity || 0);
  }, 0);

  const count = events?.length || 0;

  let level, headline, sub;

  if (count === 0) {
    level = "green";
    headline = "Roads Clear";
    sub = "No major events found today";
  } else if (totalCapacity >= 60000) {
    level = "red";
    headline = "High Traffic Risk";
    sub = "Avoid driving if possible";
  } else if (totalCapacity >= 20000) {
    level = "amber";
    headline = "Some Disruption Likely";
    sub = "Consider your timing";
  } else {
    level = "green";
    headline = "Low Traffic Risk";
    sub = "Roads should be clear";
  }

  const crowdLine = totalCapacity > 0
    ? `${count} event${count !== 1 ? "s" : ""} · ~${totalCapacity.toLocaleString()} people expected`
    : "";

  const dot = (colour, hex, glowHex, active) => `
    <div class="w-3 h-3 rounded-full transition-all duration-300"
      style="background:${hex};${active ? `box-shadow:0 0 10px 3px ${glowHex};` : "opacity:0.15;"}">
    </div>`;

  verdictEl.innerHTML = `
    <div class="flex items-center gap-4 rounded-xl border border-[#1E2D45] bg-[#0A0F1C] px-5 py-4">
      <div class="flex flex-col gap-1.5 shrink-0">
        ${dot("red",   "#EF4444", "#EF4444", level === "red")}
        ${dot("amber", "#EAB308", "#EAB308", level === "amber")}
        ${dot("green", "#22C55E", "#22C55E", level === "green")}
      </div>
      <div>
        <p class="font-display font-bold text-2xl text-white uppercase tracking-wide leading-none">${headline}</p>
        <p class="text-slate-400 text-xs mt-1">${sub}</p>
        ${crowdLine ? `<p class="text-slate-600 text-xs mt-0.5">${crowdLine}</p>` : ""}
      </div>
    </div>`;
}

export function displayEvents(events, userTimeInMins) {
  const venuesShown = 5;
  const eventsContainer = document.getElementById("events");
  const eventsSection = document.getElementById("events-section");

  renderVerdict(events);
  eventsSection?.classList.remove("hidden");

  eventsContainer.innerHTML = "";

  if (!events || events.length === 0) {
    eventsContainer.innerHTML = `<p class="text-slate-500 text-sm">No events found for that date.</p>`;
    return;
  }

  let shownCount = 0;

  const items = events
    .sort((a, b) => {
      const capA = venueCapacities[a._embedded?.venues?.[0]?.id]?.capacity || 0;
      const capB = venueCapacities[b._embedded?.venues?.[0]?.id]?.capacity || 0;
      return capB - capA;
    })
    .slice(0, venuesShown)
    .filter((event) => {
      const startTimeStr = event.dates?.start?.localTime || "00:00:00";
      const startTimeInMins = parseTimeString(startTimeStr.slice(0, 5));
      const venueId = event._embedded?.venues?.[0]?.id;
      const venueDetails = venueCapacities[venueId];

      let endTimeInMins;
      const endTimeStr = event.dates?.end?.localTime;
      if (endTimeStr && endTimeStr !== "00:00:00") {
        endTimeInMins = parseTimeString(endTimeStr.slice(0, 5));
      } else if (venueDetails?.type === "football" || venueDetails?.type === "rugby") {
        endTimeInMins = startTimeInMins + 120;
      } else if (venueDetails?.type === "cricket") {
        endTimeInMins = startTimeInMins + 180;
      } else if (venueDetails?.type === "hockey") {
        endTimeInMins = startTimeInMins + 150;
      } else {
        endTimeInMins = startTimeInMins + 180;
      }

      event._computed = { startTimeInMins, endTimeInMins, startTimeStr, venueDetails };

      if (typeof userTimeInMins === "number") {
        return userTimeInMins >= startTimeInMins - 60 && userTimeInMins <= endTimeInMins + 60;
      }
      return true;
    });

  if (items.length === 0) {
    eventsContainer.innerHTML = `<p class="text-slate-500 text-sm">No events match your chosen time.</p>`;
    return;
  }

  eventsContainer.innerHTML = `<div class="divide-y divide-[#1E2D45]">
    ${items.map((event) => {
      const { startTimeStr, startTimeInMins, endTimeInMins, venueDetails } = event._computed;
      const venueName = event._embedded?.venues?.[0]?.name || "Unknown Venue";
      const venueId = event._embedded?.venues?.[0]?.id;
      const capacity = venueCapacities[venueId]?.capacity;
      const type = venueDetails?.type || "event";

      const endH = Math.floor(endTimeInMins / 60).toString().padStart(2, "0");
      const endM = (endTimeInMins % 60).toString().padStart(2, "0");
      const startDisplay = startTimeStr !== "00:00:00" ? startTimeStr.slice(0, 5) : "TBA";
      const endDisplay = `${endH}:${endM}`;

      shownCount++;
      return `
        <div class="py-3 ${shownCount === 1 ? "pt-0" : ""}">
          <div class="flex items-start justify-between mb-1.5">
            <span class="flex items-center gap-2 text-white font-semibold text-sm">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-500 shrink-0 mt-px"></i>
              ${venueName}
            </span>
            <span class="text-[10px] text-slate-400 bg-[#151F35] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2">
              ${type}
            </span>
          </div>
          <div class="flex gap-5 ml-5 text-xs text-slate-500">
            <span class="flex items-center gap-1.5">
              <i data-lucide="clock" class="w-3 h-3 shrink-0"></i>
              ${startDisplay} – ${endDisplay}
            </span>
            ${capacity ? `
            <span class="flex items-center gap-1.5">
              <i data-lucide="users" class="w-3 h-3 shrink-0"></i>
              ${capacity.toLocaleString()}
            </span>` : ""}
          </div>
        </div>`;
    }).join("")}
  </div>`;

  createIcons({ icons: { MapPin, Clock, Users } });
}
