import { venueCapacities } from "../data/venueCapacities.js";
import { parseTimeString } from "../utils/timeUtils.js";

export function addComputedEventWindow(event) {
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

export function overlapsUserTime(event, userTimeInMins) {
  if (typeof userTimeInMins !== "number") return true;

  const { startTimeInMins, endTimeInMins } = event._computed;
  return userTimeInMins >= startTimeInMins - 60 && userTimeInMins <= endTimeInMins + 60;
}
