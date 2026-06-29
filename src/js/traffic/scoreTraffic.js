import { venueCapacities } from "../data/venueCapacities.js";

export function scoreTraffic(events, baselineTraffic = { impact: 0 }, emptySub = "No major events found today") {
  const eventCapacity = (events || []).reduce((sum, event) => {
    const venueId = event._embedded?.venues?.[0]?.id;
    return sum + (venueCapacities[venueId]?.capacity || 0);
  }, 0);
  const baselineImpact = baselineTraffic?.impact || 0;
  const totalRisk = eventCapacity + baselineImpact;
  const count = events?.length || 0;

  if (totalRisk === 0) {
    return {
      level: "green",
      headline: "Roads Clear",
      sub: emptySub,
      count,
      eventCapacity,
      baselineTraffic,
    };
  }

  if (totalRisk >= 60000) {
    return {
      level: "red",
      headline: "High Traffic Risk",
      sub: "Avoid driving if possible",
      count,
      eventCapacity,
      baselineTraffic,
    };
  }

  if (totalRisk >= 20000) {
    return {
      level: "amber",
      headline: "Some Disruption Likely",
      sub: baselineImpact > eventCapacity ? "Normal rush-hour traffic likely" : "Consider your timing",
      count,
      eventCapacity,
      baselineTraffic,
    };
  }

  return {
    level: "green",
    headline: "Low Traffic Risk",
    sub: "Roads should be clear",
    count,
    eventCapacity,
    baselineTraffic,
  };
}
