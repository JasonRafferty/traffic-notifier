const ticketmasterApiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;

export async function fetchTicketmasterEvents(city, dateInput) {
  if (!ticketmasterApiKey) {
    console.error("Missing VITE_TICKETMASTER_API_KEY. Ticketmaster events will not load.");
    return [];
  }

  const startDateTime = `${dateInput}T00:00:00Z`;
  const endDateTime = `${dateInput}T23:59:59Z`;
  const params = new URLSearchParams({
    apikey: ticketmasterApiKey,
    city,
    startDateTime,
    endDateTime,
  });

  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    if (!response.ok) throw new Error(`Ticketmaster request failed: ${response.status}`);

    const data = await response.json();
    return data._embedded?.events?.filter((event) => {
      return event.dates.start.localDate === dateInput;
    }) || [];
  } catch (error) {
    console.error("Error fetching Ticketmaster events:", error);
    return [];
  }
}
