// Convert Boston Vision Zero crash records (CSV) into GeoJSON for deck.gl.
//
// Run from the project folder:
//   npm run data
//
// Input: the crash records CSV from Analyze Boston, saved as
// boston_car_crash_data.csv in the project folder.

// Node's built-in file functions. The "node:" prefix means "built into Node",
// so there is nothing to install. The "/promises" version works with await.
import { readFile, writeFile } from "node:fs/promises";

// A CSV parser. It handles quotes and commas inside values correctly.
import { parse } from "csv-parse/sync";

// Paths are relative to the folder you run the command from (crash-map).
const INPUT_FILE = "boston_car_crash_data.csv";
const OUTPUT_FILE = "public/crashes.geojson";

// Rough box around Boston, used to drop missing or wrong coordinates.
const BOSTON_BBOX = { minLng: -71.2, maxLng: -70.98, minLat: 42.22, maxLat: 42.41 };

function isInBoston(lng, lat) {
  return (
    lng >= BOSTON_BBOX.minLng &&
    lng <= BOSTON_BBOX.maxLng &&
    lat >= BOSTON_BBOX.minLat &&
    lat <= BOSTON_BBOX.maxLat
  );
}

// "2015-12-23 02:25:08+00" (UTC) -> "2015-12-23T02:25:08Z" (standard ISO format).
// Browsers parse the ISO version reliably and convert it to local time.
function toIsoUtc(dispatchTs) {
  return dispatchTs.replace(" ", "T").replace("+00", "Z");
}

// Keep 6 decimal places (about 0.1 m). This makes the file noticeably smaller.
function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

// 1. Read the whole CSV file as one big string.
//    "utf8" tells Node to decode the bytes as text.
const text = await readFile(INPUT_FILE, "utf8");

// 2. Parse the text into an array of objects.
//    columns: true -> use the header row as keys, so each row looks like
//                     { dispatch_ts: "...", mode_type: "mv", lat: "42.33", ... }
//    bom: true     -> strip an invisible marker some tools put at the start of the file
const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true });
console.log("Rows in CSV:", rows.length);

// 3. Turn each row into a GeoJSON Feature.
//    CSV values are always strings, so convert coordinates with Number().
const features = rows
  .map((row) => ({ ...row, lng: Number(row.long), lat: Number(row.lat) }))
  .filter((row) => isInBoston(row.lng, row.lat))
  .map((row, index) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [round6(row.lng), round6(row.lat)], // longitude first!
    },
    properties: {
      id: index + 1,
      time: toIsoUtc(row.dispatch_ts),
      mode: row.mode_type, // "mv", "ped" or "bike"
      locationType: row.location_type, // "Street", "Intersection" or "Other"
      street: row.street,
      crossStreet: row.xstreet1,
    },
  }));

// 4. Count crashes by mode, as a quick check.
const countsByMode = features.reduce((acc, f) => {
  const mode = f.properties.mode;
  acc[mode] = (acc[mode] ?? 0) + 1;
  return acc;
}, {});

// 5. Wrap the features in a FeatureCollection and write it to disk.
//    JSON.stringify turns the JavaScript object into a JSON string.
const geojson = { type: "FeatureCollection", features };
await writeFile(OUTPUT_FILE, JSON.stringify(geojson));

console.log("Features written:", features.length);
console.log("Dropped (bad or missing coordinates):", rows.length - features.length);
console.log("By mode:", countsByMode);
console.log("Saved to", OUTPUT_FILE);
