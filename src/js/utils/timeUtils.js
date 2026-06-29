export function parseTimeString(timeStr) {
  const [hh, mm] = timeStr.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}
