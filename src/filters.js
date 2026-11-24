// Pure helpers for the time-of-day filter.
// They have no DOM or deck.gl code, so they are easy to test.

/**
 * True if `hour` is inside [start, end].
 * Handles ranges that cross midnight, such as 22:00 to 04:00.
 */
export function inHourRange(hour, start, end) {
  if (start <= end) {
    return hour >= start && hour <= end;
  }
  return hour >= start || hour <= end;
}

/** All hours (0–23) inside [start, end]. */
export function hoursInRange(start, end) {
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    if (inHourRange(hour, start, end)) {
      hours.push(hour);
    }
  }
  return hours;
}

/** Format an hour as "HH:00", for example 7 -> "07:00". */
export function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}
