export function parseTimeString(timeStr) {
  const [hh, mm] = timeStr.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

export function formatLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
