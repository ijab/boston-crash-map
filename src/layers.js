import { ScatterplotLayer } from "@deck.gl/layers";
import { HexagonLayer, HeatmapLayer } from "@deck.gl/aggregation-layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { hoursInRange } from "./filters.js";

const MODE_COLORS = {
  mv: [220, 50, 50, 160], // motor vehicle: red
  ped: [255, 160, 0, 200], // pedestrian: orange
  bike: [40, 120, 220, 200], // bicycle: blue
};
const DEFAULT_COLOR = [128, 128, 128, 160];

const MODE_LABELS = {
  mv: "Motor vehicle",
  ped: "Pedestrian",
  bike: "Bicycle",
};

// GeoJSON and deck.gl both use [longitude, latitude].
const getPosition = (feature) => feature.geometry.coordinates;

// Reuse one extension instance across renders, as deck.gl recommends.
// Category filtering (not filterRange) lets a range cross midnight.
const hourFilterExtension = new DataFilterExtension({ categorySize: 1 });

/**
 * Points filter on the GPU: the data stays the same and only
 * filterCategories changes, so dragging the slider is cheap.
 */
function makePointsLayer({ crashes, startHour, endHour }) {
  return new ScatterplotLayer({
    id: "points",
    data: crashes,
    getPosition,
    getRadius: 3,
    radiusUnits: "pixels",
    getFillColor: (f) => MODE_COLORS[f.properties.mode] ?? DEFAULT_COLOR,
    pickable: true,
    extensions: [hourFilterExtension],
    getFilterCategory: (f) => f.properties.hour,
    filterCategories: hoursInRange(startHour, endHour),
  });
}

// HexagonLayer aggregates on the CPU and does not support DataFilterExtension.
// HeatmapLayer did not filter in this setup (deck.gl 9.4 + GoogleMapsOverlay).
// Both get a pre-filtered array instead.

function makeHexagonLayer({ filteredCrashes }) {
  return new HexagonLayer({
    id: "hexagons",
    data: filteredCrashes,
    getPosition,
    radius: 200, // meters
    extruded: true, // taller columns mean more crashes
    elevationScale: 4,
    coverage: 0.9, // leave a small gap between hexagons
    pickable: true,
  });
}

function makeHeatmapLayer({ filteredCrashes }) {
  return new HeatmapLayer({
    id: "heatmap",
    data: filteredCrashes,
    getPosition,
    radiusPixels: 30,
    intensity: 1,
    threshold: 0.05,
  });
}

export const LAYER_FACTORIES = {
  points: makePointsLayer,
  hexagons: makeHexagonLayer,
  heatmap: makeHeatmapLayer,
};

/** Tooltip text for the object under the cursor, or null for none. */
export function getTooltip({ object, layer }) {
  if (!object) {
    return null;
  }
  if (layer.id === "hexagons") {
    return `${object.count} crashes`;
  }

  const { mode, locationType, street, crossStreet, time } = object.properties;
  const place = [street, crossStreet].filter(Boolean).join(" & ") || "Unknown location";
  return [
    `${MODE_LABELS[mode] ?? mode} · ${locationType}`,
    place,
    new Date(time).toLocaleString("en-US", { timeZone: "America/New_York" }),
  ].join("\n");
}
