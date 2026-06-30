import { venueCapacities } from "../data/venueCapacities.js";

export function scoreTraffic(
  events,
  baselineTraffic = { impact: 0 },
  emptySub = "No major events found today",
  providerStatuses = []
) {
  const eventCapacity = (events || []).reduce((sum, event) => sum + getKnownCapacity(event), 0);
  const baselineImpact = baselineTraffic?.impact || 0;
  const totalRisk = eventCapacity + baselineImpact;
  const count = events?.length || 0;
  const unknownTrafficRelevantCapacityCount = (events || []).filter(hasTrafficRelevantUnknownCapacity).length;
  const ignoredUnknownCapacityCount = (events || []).filter(hasLowImpactUnknownCapacity).length;
  const providerIssues = (providerStatuses || []).filter((provider) => {
    return provider?.status && provider.status !== "success";
  });
  const dataQuality = {
    unknownCapacityCount: unknownTrafficRelevantCapacityCount,
    ignoredUnknownCapacityCount,
    providerIssues,
  };

  if (totalRisk === 0 && (unknownTrafficRelevantCapacityCount > 0 || providerIssues.length > 0)) {
    return {
      level: "amber",
      headline: "Traffic Risk Unclear",
      sub: unknownTrafficRelevantCapacityCount > 0
        ? "Potentially significant events found, but capacity data is missing"
        : "Some event data could not be checked",
      count,
      eventCapacity,
      baselineTraffic,
      dataQuality,
    };
  }

  if (totalRisk === 0) {
    return {
      level: "green",
      headline: count > 0 ? "Low Traffic Risk" : "Roads Clear",
      sub: count > 0 ? "Only low-impact events found" : emptySub,
      count,
      eventCapacity,
      baselineTraffic,
      dataQuality,
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
      dataQuality,
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
      dataQuality,
    };
  }

  return {
    level: "green",
    headline: "Low Traffic Risk",
    sub: "Roads should be clear",
    count,
    eventCapacity,
    baselineTraffic,
    dataQuality,
  };
}

function getKnownCapacity(event) {
  const venueId = event._embedded?.venues?.[0]?.id;
  return venueCapacities[venueId]?.capacity || 0;
}

function hasUnknownCapacity(event) {
  return getKnownCapacity(event) === 0;
}

function hasTrafficRelevantUnknownCapacity(event) {
  if (!hasUnknownCapacity(event)) return false;

  const venueName = normaliseText(event._embedded?.venues?.[0]?.name);
  const eventType = normaliseText([
    event.classifications?.[0]?.segment?.name,
    event.classifications?.[0]?.genre?.name,
  ].filter(Boolean).join(" "));

  if (matchesAny(venueName, lowImpactVenueTerms) || matchesAny(eventType, lowImpactEventTerms)) {
    return false;
  }

  return matchesAny(venueName, trafficRelevantVenueTerms) || matchesAny(eventType, trafficRelevantEventTerms);
}

function hasLowImpactUnknownCapacity(event) {
  return hasUnknownCapacity(event) && !hasTrafficRelevantUnknownCapacity(event);
}

function normaliseText(value) {
  return String(value || "").toLowerCase();
}

function matchesAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

const trafficRelevantVenueTerms = [
  "arena",
  "stadium",
  "park",
  "common",
  "castle",
  "fields",
  "field",
  "airport",
  "airfield",
  "racecourse",
  "exhibition",
  "warehouse",
  "bowl",
];

const trafficRelevantEventTerms = [
  "sports",
  "festival",
];

const lowImpactVenueTerms = [
  "bar",
  "pub",
  "club",
  "comedy",
  "cafe",
  "basement",
  "room",
  "lounge",
  "hotel",
  "museum",
  "restaurant",
  "chapel",
  "church",
];

const lowImpactEventTerms = [
  "comedy",
  "miscellaneous",
];
