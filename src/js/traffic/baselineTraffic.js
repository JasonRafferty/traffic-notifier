import { cityRushHourProfiles } from "../data/rushHourProfiles.js";

function isWithin(minutes, start, end) {
  return minutes >= start && minutes <= end;
}

export function getBaselineTraffic(city, currentDate, userTimeInMins) {
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
