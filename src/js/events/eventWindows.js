import { venueCapacities } from "../data/venueCapacities.js";
import { parseTimeString } from "../utils/timeUtils.js";

function getEventDurationMins(event) {
  const genre = (event.classifications?.[0]?.genre?.name ?? "").toLowerCase();
  const segment = (event.classifications?.[0]?.segment?.name ?? "").toLowerCase();

  if (genre.includes("soccer") || genre.includes("football") || genre.includes("rugby")) return 120;
  if (genre.includes("cricket")) return 180;
  if (genre.includes("hockey")) return 150;
  if (segment === "sports") return 120;
  return 180;
}

export function addComputedEventWindow(event) {
  const rawStartTime = event.dates?.start?.localTime;
  const hasKnownStartTime = Boolean(rawStartTime && rawStartTime !== "00:00:00");
  const startTimeStr = hasKnownStartTime ? rawStartTime : "00:00:00";
  const startTimeInMins = hasKnownStartTime ? parseTimeString(startTimeStr.slice(0, 5)) : 0;
  const venueId = event._embedded?.venues?.[0]?.id;
  const venueDetails = venueCapacities[venueId];

  const endTimeStr = event.dates?.end?.localTime;
  let endTimeInMins = 23 * 60 + 59;

  if (hasKnownStartTime) {
    endTimeInMins = endTimeStr && endTimeStr !== "00:00:00"
      ? parseTimeString(endTimeStr.slice(0, 5))
      : startTimeInMins + getEventDurationMins(event);
  }

  return {
    ...event,
    _computed: { startTimeInMins, endTimeInMins, startTimeStr, hasKnownStartTime, venueDetails },
  };
}

export function overlapsUserTime(event, userTimeInMins) {
  if (typeof userTimeInMins !== "number") return true;

  const { startTimeInMins, endTimeInMins } = event._computed;
  return userTimeInMins >= startTimeInMins - 60 && userTimeInMins <= endTimeInMins + 60;
}
