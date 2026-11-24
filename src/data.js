import { inHourRange } from "./filters.js";

// Crash times are stored in UTC. Convert them to the hour of day in Boston.
const bostonHour = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  hourCycle: "h23", // 0–23, so midnight is 0, not 24
});

/**
 * Load crash features from a GeoJSON file and add a local `hour` (0–23)
 * to each feature. Throws if the file cannot be loaded.
 */
export async function loadCrashes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  }

  const { features } = await response.json();
  for (const feature of features) {
    feature.properties.hour = Number(
      bostonHour.format(new Date(feature.properties.time)),
    );
  }
  return features;
}

/**
 * Return a function that filters crashes by hour range.
 * It reuses the last result when the range has not changed. A stable array
 * reference matters: deck.gl only recomputes a layer when its data changes.
 */
export function createHourFilter(crashes) {
  let last = { key: null, data: crashes };

  return function filterByHour(start, end) {
    const key = `${start}-${end}`;
    if (last.key !== key) {
      last = {
        key,
        data: crashes.filter((f) => inHourRange(f.properties.hour, start, end)),
      };
    }
    return last.data;
  };
}
