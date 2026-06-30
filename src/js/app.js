import { fetchFootballMatches } from "./api/sportsdb.js";
import { fetchTicketmasterEvents } from "./api/ticketmaster.js";
import { dedupeEvents } from "./events/dedupeEvents.js";
import { addComputedEventWindow, overlapsUserTime } from "./events/eventWindows.js";
import { getBaselineTraffic } from "./traffic/baselineTraffic.js";
import { scoreTraffic } from "./traffic/scoreTraffic.js";
import { getSearchInputs, setupControls } from "./ui/controls.js";
import { showLoading } from "./ui/loading.js";
import {
  renderEmptyState,
  renderEvents,
  renderNoTimeMatches,
  renderProviderIssueState,
  showEventsSection,
} from "./ui/renderEvents.js";
import { renderVerdict } from "./ui/renderVerdict.js";
import { venueCapacities } from "./data/venueCapacities.js";

const venuesShown = 5;

document.addEventListener("DOMContentLoaded", () => {
  setupControls(handleSearchButton);
});

async function handleSearchButton() {
  const { city, date, userTimeInMins } = getSearchInputs();
  if (!city) {
    alert("Please select a city.");
    return;
  }

  if (!date) {
    alert("Please select a date.");
    return;
  }

  showLoading();

  const [ticketmasterResult, footballResult] = await Promise.all([
    fetchTicketmasterEvents(city, date),
    fetchFootballMatches(city, date),
  ]);

  displayResults({
    events: dedupeEvents([...ticketmasterResult.events, ...footballResult.events]),
    providerStatuses: [ticketmasterResult, footballResult],
    userTimeInMins,
    date,
    city,
  });
}

function displayResults({ events, providerStatuses, userTimeInMins, date, city }) {
  const eventsContainer = document.getElementById("events");
  showEventsSection();
  eventsContainer.innerHTML = "";

  const baselineTraffic = getBaselineTraffic(city, date, userTimeInMins);

  if (!events || events.length === 0) {
    renderVerdict(scoreTraffic([], baselineTraffic, "No major events found today", providerStatuses));
    if (hasProviderIssue(providerStatuses)) {
      renderProviderIssueState(eventsContainer, providerStatuses);
      return;
    }
    renderEmptyState(eventsContainer, date);
    return;
  }

  const hasTimeFilter = typeof userTimeInMins === "number";
  const computedEvents = events.map(addComputedEventWindow);
  const matchingEvents = computedEvents.filter((event) => overlapsUserTime(event, userTimeInMins));

  renderVerdict(scoreTraffic(
    matchingEvents,
    baselineTraffic,
    hasTimeFilter ? "No events overlap with your chosen time" : "No major events found today",
    providerStatuses
  ));

  const items = sortByCapacity(matchingEvents).slice(0, venuesShown);

  if (items.length === 0) {
    renderNoTimeMatches(eventsContainer, hasTimeFilter ? sortByCapacity(computedEvents).slice(0, venuesShown) : []);
    return;
  }

  renderEvents(eventsContainer, items);
}

function sortByCapacity(events) {
  return [...events].sort((a, b) => {
    const capA = venueCapacities[a._embedded?.venues?.[0]?.id]?.capacity || 0;
    const capB = venueCapacities[b._embedded?.venues?.[0]?.id]?.capacity || 0;
    return capB - capA;
  });
}

function hasProviderIssue(providerStatuses = []) {
  return providerStatuses.some((provider) => provider?.status && provider.status !== "success");
}
