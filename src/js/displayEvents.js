import { createIcons, MapPin, Clock, Users } from 'lucide';
import { venueCapacities } from "./venues.js";
import { parseTimeString } from "./timeUtils.js";

let clickHandlerAttached = false;

const cityRushHourProfiles = {
  London: { peak: 30000, shoulder: 14000 },
  Manchester: { peak: 24000, shoulder: 10000 },
  Birmingham: { peak: 22000, shoulder: 9000 },
  Glasgow: { peak: 19000, shoulder: 8000 },
  Liverpool: { peak: 18000, shoulder: 7500 },
  Leeds: { peak: 18000, shoulder: 7500 },
  Sheffield: { peak: 16000, shoulder: 6500 },
  Edinburgh: { peak: 16000, shoulder: 6500 },
  Cardiff: { peak: 15000, shoulder: 6000 },
  Newcastle: { peak: 14500, shoulder: 6000 },
  Nottingham: { peak: 14000, shoulder: 5500 },
  Leicester: { peak: 13000, shoulder: 5000 },
  Southampton: { peak: 12000, shoulder: 4500 },
  Wolverhampton: { peak: 12000, shoulder: 4500 },
  Sunderland: { peak: 10000, shoulder: 4000 },
  Belfast: { peak: 13000, shoulder: 5000 },
};

export function showLoading() {
  const verdictEl = document.getElementById("verdict");
  const eventsSection = document.getElementById("events-section");
  const eventsContainer = document.getElementById("events");

  if (verdictEl) {
    verdictEl.innerHTML = `
      <div class="flex items-center gap-4 rounded-xl border border-[#1E2D45] bg-[#0A0F1C] px-5 py-4">
        <div class="flex flex-col gap-1.5 shrink-0">
          <div class="w-3 h-3 rounded-full bg-[#1E2D45] animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-[#1E2D45] animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-[#1E2D45] animate-pulse"></div>
        </div>
        <div class="space-y-2 flex-1">
          <div class="h-6 w-40 rounded-md bg-[#1E2D45] animate-pulse"></div>
          <div class="h-3 w-28 rounded-md bg-[#1E2D45] animate-pulse"></div>
        </div>
      </div>`;
  }

  if (eventsSection) {
    eventsSection.classList.remove("hidden");
    eventsSection.classList.remove("fade-in");
    void eventsSection.offsetWidth;
    eventsSection.classList.add("fade-in");
  }

  if (eventsContainer) {
    eventsContainer.innerHTML = `
      <div class="divide-y divide-[#1E2D45]">
        ${[0, 1, 2].map(() => `
          <div class="py-3">
            <div class="flex items-start justify-between mb-2">
              <div class="h-4 w-44 rounded-md bg-[#1E2D45] animate-pulse"></div>
              <div class="h-4 w-14 rounded-full bg-[#1E2D45] animate-pulse ml-2"></div>
            </div>
            <div class="flex gap-5 ml-5">
              <div class="h-3 w-20 rounded-md bg-[#1E2D45] animate-pulse"></div>
              <div class="h-3 w-14 rounded-md bg-[#1E2D45] animate-pulse"></div>
            </div>
          </div>`).join("")}
      </div>`;
  }
}

function renderVerdict(events, baselineTraffic, emptySub = "No major events found today") {
  const verdictEl = document.getElementById("verdict");
  if (!verdictEl) return;

  const eventCapacity = (events || []).reduce((sum, event) => {
    const venueId = event._embedded?.venues?.[0]?.id;
    return sum + (venueCapacities[venueId]?.capacity || 0);
  }, 0);
  const baselineImpact = baselineTraffic?.impact || 0;
  const totalRisk = eventCapacity + baselineImpact;

  const count = events?.length || 0;

  let level, headline, sub;

  if (totalRisk === 0) {
    level = "green";
    headline = "Roads Clear";
    sub = emptySub;
  } else if (totalRisk >= 60000) {
    level = "red";
    headline = "High Traffic Risk";
    sub = "Avoid driving if possible";
  } else if (totalRisk >= 20000) {
    level = "amber";
    headline = "Some Disruption Likely";
    sub = baselineImpact > eventCapacity ? "Normal rush-hour traffic likely" : "Consider your timing";
  } else {
    level = "green";
    headline = "Low Traffic Risk";
    sub = "Roads should be clear";
  }

  const eventLine = eventCapacity > 0
    ? `${count} event${count !== 1 ? "s" : ""} · ~${eventCapacity.toLocaleString()} people expected`
    : "";
  const baselineLine = baselineImpact > 0
    ? `${baselineTraffic.label} · ${baselineTraffic.city} baseline traffic`
    : "";

  const dot = (hex, glowHex, active) => `
    <div class="relative w-3 h-3 shrink-0">
      ${active ? `<div class="absolute inset-0 rounded-full animate-ping opacity-40" style="background:${glowHex}"></div>` : ""}
      <div class="relative w-3 h-3 rounded-full transition-all duration-300"
        style="background:${hex};${active ? `box-shadow:0 0 10px 3px ${glowHex};` : "opacity:0.15;"}">
      </div>
    </div>`;

  verdictEl.innerHTML = `
    <div class="fade-in flex items-center gap-4 rounded-xl border border-[#1E2D45] bg-[#0A0F1C] px-5 py-4">
      <div class="flex flex-col gap-1.5 shrink-0">
        ${dot("#EF4444", "#EF4444", level === "red")}
        ${dot("#EAB308", "#EAB308", level === "amber")}
        ${dot("#22C55E", "#22C55E", level === "green")}
      </div>
      <div>
        <p class="font-display font-bold text-2xl text-white uppercase tracking-wide leading-none">${headline}</p>
        <p class="text-slate-400 text-xs mt-1">${sub}</p>
        ${eventLine ? `<p class="text-slate-600 text-xs mt-0.5">${eventLine}</p>` : ""}
        ${baselineLine ? `<p class="text-slate-600 text-xs mt-0.5">${baselineLine}</p>` : ""}
      </div>
    </div>`;
}

function isWithin(minutes, start, end) {
  return minutes >= start && minutes <= end;
}

function getBaselineTraffic(city, currentDate, userTimeInMins) {
  if (!city || !currentDate || typeof userTimeInMins !== "number") {
    return { impact: 0 };
  }

  const day = new Date(`${currentDate}T12:00:00`).getDay();
  const isWeekday = day >= 1 && day <= 5;
  if (!isWeekday) return { impact: 0 };

  const profile = cityRushHourProfiles[city] || { peak: 11000, shoulder: 4000 };

  if (isWithin(userTimeInMins, 7 * 60, 9 * 60 + 30)) {
    return { impact: profile.peak, label: "Weekday morning rush hour", city };
  }

  if (isWithin(userTimeInMins, 16 * 60 + 30, 18 * 60 + 30)) {
    return { impact: profile.peak, label: "Weekday evening rush hour", city };
  }

  if (
    isWithin(userTimeInMins, 6 * 60 + 30, 7 * 60 - 1) ||
    isWithin(userTimeInMins, 9 * 60 + 31, 10 * 60 + 30) ||
    isWithin(userTimeInMins, 15 * 60 + 30, 16 * 60 + 29) ||
    isWithin(userTimeInMins, 18 * 60 + 31, 19 * 60 + 30)
  ) {
    return { impact: profile.shoulder, label: "Rush-hour shoulder period", city };
  }

  return { impact: 0 };
}

function addComputedEventWindow(event) {
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

  return {
    ...event,
    _computed: { startTimeInMins, endTimeInMins, startTimeStr, venueDetails },
  };
}

function overlapsUserTime(event, userTimeInMins) {
  if (typeof userTimeInMins !== "number") return true;

  const { startTimeInMins, endTimeInMins } = event._computed;
  return userTimeInMins >= startTimeInMins - 60 && userTimeInMins <= endTimeInMins + 60;
}

function renderEmptyState(container, currentDate) {
  if (!currentDate) {
    container.innerHTML = `<p class="text-slate-500 text-sm">No events found for that date.</p>`;
    return;
  }

  const d = new Date(currentDate + "T12:00:00");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const nearbyDates = [-1, 1, 2, 3].map(offset => {
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

  container.querySelectorAll(".nearby-date-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const dateInput = document.getElementById("dateInput");
      dateInput.value = btn.dataset.date;
      document.querySelectorAll(".date-chip").forEach(c => {
        c.classList.toggle("active", c.dataset.value === btn.dataset.date);
      });
      document.getElementById("inputButton").click();
    });
  });
}

export function displayEvents(events, userTimeInMins, currentDate, city) {
  const venuesShown = 5;
  const eventsContainer = document.getElementById("events");
  const eventsSection = document.getElementById("events-section");

  if (eventsSection) {
    eventsSection.classList.remove("hidden");
    eventsSection.classList.remove("fade-in");
    void eventsSection.offsetWidth;
    eventsSection.classList.add("fade-in");
  }

  eventsContainer.innerHTML = "";
  const baselineTraffic = getBaselineTraffic(city, currentDate, userTimeInMins);

  if (!events || events.length === 0) {
    renderVerdict([], baselineTraffic);
    renderEmptyState(eventsContainer, currentDate);
    return;
  }

  let shownCount = 0;
  const hasTimeFilter = typeof userTimeInMins === "number";
  const matchingEvents = events
    .map(addComputedEventWindow)
    .filter((event) => overlapsUserTime(event, userTimeInMins));

  renderVerdict(
    matchingEvents,
    baselineTraffic,
    hasTimeFilter ? "No events overlap with your chosen time" : "No major events found today"
  );

  const items = [...matchingEvents]
    .sort((a, b) => {
      const capA = venueCapacities[a._embedded?.venues?.[0]?.id]?.capacity || 0;
      const capB = venueCapacities[b._embedded?.venues?.[0]?.id]?.capacity || 0;
      return capB - capA;
    })
    .slice(0, venuesShown);

  if (items.length === 0) {
    eventsContainer.innerHTML = `
      <div class="space-y-2">
        <p class="text-slate-500 text-sm">No events overlap with your chosen time.</p>
        <button id="clearTimeFilter" class="chip active">Clear time filter</button>
      </div>`;
    document.getElementById("clearTimeFilter").addEventListener("click", () => {
      const timeInput = document.getElementById("timeInput");
      timeInput.value = "";
      document.querySelectorAll(".time-chip").forEach(b => {
        b.classList.toggle("active", b.dataset.time === "");
      });
      document.getElementById("inputButton").click();
    });
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
              ${startDisplay} – ${endDisplay}
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

  createIcons({ icons: { MapPin, Clock, Users } });

  if (!clickHandlerAttached) {
    eventsContainer.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const card = e.target.closest(".event-card");
      if (!card) return;
      card.querySelector(".event-detail")?.classList.toggle("hidden");
      card.querySelector(".expand-icon")?.classList.toggle("rotate-180");
    });
    clickHandlerAttached = true;
  }
}
