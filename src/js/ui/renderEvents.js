import { createIcons, Clock, MapPin, Users } from "lucide";
import { venueCapacities } from "../data/venueCapacities.js";

let clickHandlerAttached = false;

export function showEventsSection() {
  const eventsSection = document.getElementById("events-section");
  if (!eventsSection) return;

  eventsSection.classList.remove("hidden");
  eventsSection.classList.remove("fade-in");
  void eventsSection.offsetWidth;
  eventsSection.classList.add("fade-in");
}

export function renderEmptyState(container, currentDate) {
  if (!currentDate) {
    container.innerHTML = `<p class="text-slate-500 text-sm">No events found for that date.</p>`;
    return;
  }

  const d = new Date(`${currentDate}T12:00:00`);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const nearbyDates = [-1, 1, 2, 3].map((offset) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() + offset);
    return {
      value: nd.toISOString().split("T")[0],
      label: `${dayNames[nd.getDay()]} ${nd.getDate()} ${monthNames[nd.getMonth()]}`,
    };
  });

  container.innerHTML = `
    <div class="space-y-3">
      <p class="text-slate-500 text-sm">No major events found for this date.</p>
      <div>
        <p class="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Try a nearby date</p>
        <div class="flex gap-1.5 flex-wrap">
          ${nearbyDates.map(({ value, label }) => `
            <button class="chip nearby-date-btn" data-date="${value}">${label}</button>
          `).join("")}
        </div>
      </div>
    </div>`;

  container.querySelectorAll(".nearby-date-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dateInput = document.getElementById("dateInput");
      dateInput.value = btn.dataset.date;
      document.querySelectorAll(".date-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.value === btn.dataset.date);
      });
      document.getElementById("inputButton").click();
    });
  });
}

export function renderNoTimeMatches(container) {
  container.innerHTML = `
    <div class="space-y-2">
      <p class="text-slate-500 text-sm">No events overlap with your chosen time.</p>
      <button id="clearTimeFilter" class="chip active">Clear time filter</button>
    </div>`;

  document.getElementById("clearTimeFilter").addEventListener("click", () => {
    const timeInput = document.getElementById("timeInput");
    timeInput.value = "";
    document.querySelectorAll(".time-chip").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.time === "");
    });
    document.getElementById("inputButton").click();
  });
}

export function renderEvents(container, items) {
  let shownCount = 0;

  container.innerHTML = `<div class="divide-y divide-[#1E2D45]">
    ${items.map((event) => {
      const { startTimeStr, endTimeInMins, venueDetails } = event._computed;
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
        <div class="event-card py-3 cursor-pointer select-none ${shownCount === 1 ? "pt-0" : ""}">
          <div class="flex items-start justify-between mb-1.5">
            <span class="flex items-center gap-2 text-white font-semibold text-sm">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-500 shrink-0 mt-px"></i>
              ${venueName}
            </span>
            <div class="flex items-center gap-1.5 shrink-0 ml-2">
              <span class="text-[10px] text-slate-400 bg-[#151F35] px-2 py-0.5 rounded-full uppercase tracking-wider">
                ${type}
              </span>
              <svg class="expand-icon w-3.5 h-3.5 text-slate-600 transition-transform duration-200 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
          <div class="flex gap-5 ml-5 text-xs text-slate-500">
            <span class="flex items-center gap-1.5">
              <i data-lucide="clock" class="w-3 h-3 shrink-0"></i>
              ${startDisplay} - ${endDisplay}
            </span>
            ${capacity ? `
            <span class="flex items-center gap-1.5">
              <i data-lucide="users" class="w-3 h-3 shrink-0"></i>
              ${capacity.toLocaleString()}
            </span>` : ""}
          </div>
          <div class="event-detail hidden mt-2.5 ml-5 pt-2.5 border-t border-[#1E2D45]">
            <p class="text-white text-xs font-medium leading-snug">${event.name || ""}</p>
            ${event.url ? `
            <a href="${event.url}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-white mt-1.5 transition-colors">
              <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              View tickets
            </a>` : ""}
          </div>
        </div>`;
    }).join("")}
  </div>`;

  createIcons({ icons: { Clock, MapPin, Users } });
  attachEventCardClickHandler(container);
}

function attachEventCardClickHandler(container) {
  if (clickHandlerAttached) return;

  container.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const card = e.target.closest(".event-card");
    if (!card) return;
    card.querySelector(".event-detail")?.classList.toggle("hidden");
    card.querySelector(".expand-icon")?.classList.toggle("rotate-180");
  });
  clickHandlerAttached = true;
}
