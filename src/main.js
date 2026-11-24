import "./style.css";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import { createHourFilter, loadCrashes } from "./data.js";
import { formatHour } from "./filters.js";
import { getTooltip, LAYER_FACTORIES } from "./layers.js";

const BOSTON = { lat: 42.36, lng: -71.08 };
const DATA_URL = "/crashes.geojson"; // served from the public/ folder

const ui = {
  map: document.getElementById("map"),
  status: document.getElementById("status"),
  modeButtons: document.querySelectorAll("#modes button"),
  startInput: document.getElementById("startHour"),
  endInput: document.getElementById("endHour"),
  startLabel: document.getElementById("startLabel"),
  endLabel: document.getElementById("endLabel"),
  countLabel: document.getElementById("countLabel"),
};

function showStatus(message) {
  ui.status.textContent = message;
  ui.status.hidden = !message;
}

async function createMap(apiKey, mapId) {
  setOptions({ key: apiKey, v: "weekly" });
  const { Map } = await importLibrary("maps");
  return new Map(ui.map, {
    center: BOSTON,
    zoom: 13,
    mapId, // a vector Map ID lets deck.gl draw into the map (interleaved mode)
    tiltInteractionEnabled: true,
    headingInteractionEnabled: true,
  });
}

async function main() {
  const { VITE_MAPS_KEY: apiKey, VITE_MAP_ID: mapId } = import.meta.env;
  if (!apiKey || !mapId) {
    showStatus("Missing VITE_MAPS_KEY or VITE_MAP_ID. See .env.example.");
    return;
  }

  const map = await createMap(apiKey, mapId);
  const overlay = new GoogleMapsOverlay({ layers: [], getTooltip });
  overlay.setMap(map);

  showStatus("Loading crash data…");
  let crashes;
  try {
    crashes = await loadCrashes(DATA_URL);
  } catch (error) {
    console.error(error);
    showStatus("Could not load crash data. Please try again later.");
    return;
  }
  showStatus("");

  const filterByHour = createHourFilter(crashes);
  const state = { mode: "points", startHour: 0, endHour: 23 };

  function render() {
    const filteredCrashes = filterByHour(state.startHour, state.endHour);
    const makeLayer = LAYER_FACTORIES[state.mode];
    overlay.setProps({
      layers: [makeLayer({ ...state, crashes, filteredCrashes })],
    });

    ui.startLabel.textContent = formatHour(state.startHour);
    ui.endLabel.textContent = formatHour(state.endHour);
    ui.countLabel.textContent = `${filteredCrashes.length.toLocaleString()} crashes`;
    for (const button of ui.modeButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
    }
  }

  for (const button of ui.modeButtons) {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  }
  ui.startInput.addEventListener("input", () => {
    state.startHour = Number(ui.startInput.value);
    render();
  });
  ui.endInput.addEventListener("input", () => {
    state.endHour = Number(ui.endInput.value);
    render();
  });

  render();
}

main();
