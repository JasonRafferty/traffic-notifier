export function dedupeEvents(events) {
  const seenIds = new Set();
  const seenSlots = new Set();

  return events.filter((event) => {
    const venueId = event._embedded?.venues?.[0]?.id || "unknown-venue";
    const date = event.dates?.start?.localDate || "unknown-date";
    const time = event.dates?.start?.localTime || "unknown-time";
    const idKey = event.id;
    const slotKey = `${venueId}-${date}-${time}`;

    if ((idKey && seenIds.has(idKey)) || seenSlots.has(slotKey)) return false;
    if (idKey) seenIds.add(idKey);
    seenSlots.add(slotKey);
    return true;
  });
}
