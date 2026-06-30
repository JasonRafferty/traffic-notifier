const ticketmasterApiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
const pageSize = "200";
const countryCode = "GB";

function success(events) {
  return { events, status: "success", source: "Ticketmaster" };
}

function unavailable(message) {
  return { events: [], status: "error", source: "Ticketmaster", message };
}

export async function fetchTicketmasterEvents(city, dateInput) {
  if (!ticketmasterApiKey) {
    const message = "Missing Ticketmaster API key. Ticketmaster events will not load.";
    console.error(message);
    return unavailable(message);
  }

  const startDateTime = `${dateInput}T00:00:00Z`;
  const endDateTime = `${dateInput}T23:59:59Z`;
  const params = new URLSearchParams({
    apikey: ticketmasterApiKey,
    city,
    countryCode,
    startDateTime,
    endDateTime,
    size: pageSize,
  });

  try {
    const events = [];
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages) {
      params.set("page", String(currentPage));
      const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
      if (!response.ok) throw new Error(`Ticketmaster request failed: ${response.status}`);

      const data = await response.json();
      events.push(...(data._embedded?.events || []));
      totalPages = data.page?.totalPages || 1;
      currentPage += 1;
    }

    return success(events.filter((event) => {
      return event.dates?.start?.localDate === dateInput;
    }));
  } catch (error) {
    console.error("Error fetching Ticketmaster events:", error);
    return unavailable("Ticketmaster events could not be loaded.");
  }
}
