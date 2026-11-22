import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Pane,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toneCategory, TONE_HEX } from "../utils/eventTone";
import { loadCountriesGeoJson, getCountryName } from "../utils/countries";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

const ACCENT_RED = "#D80027";

// country border styling
function countryStyle(feature, selectedCountry) {
  const countryName = getCountryName(feature);
  const isSelected = selectedCountry && countryName === selectedCountry;
  return {
    weight: isSelected ? 1.4 : 0.6,
    color: ACCENT_RED,
    fillColor: ACCENT_RED,
    fillOpacity: 0,
    opacity: isSelected ? 0.9 : 0.4,
  };
}

// Separate component so it lives inside MapContainer context
function GeoJSONLayer({ geoData, selectedCountry, onCountryClick }) {
  // Use a new key whenever selectedCountry changes so react-leaflet
  // re-creates the layer with fresh styles — avoids stale closure issues.
  const layerKey = selectedCountry || "__none__";
  const layerRef = useRef(null);

  function onEachFeature(feature, layer) {
    const name = getCountryName(feature);

    layer.on({
      mouseover(e) {
        e.target.setStyle({
          weight: 1.6,
          color: ACCENT_RED,
          fillOpacity: 0.2,
          opacity: 0.9,
        });
        // styled by .leaflet-tooltip-dark in index.css
        e.target
          .bindTooltip(name, {
            sticky: true,
            direction: "top",
            offset: [0, -8],
            className: "leaflet-tooltip-dark",
          })
          .openTooltip();
      },
      mouseout(e) {
        if (layerRef.current) layerRef.current.resetStyle(e.target);
        e.target.closeTooltip();
      },
      click() {
        if (name !== "Unknown") {
          onCountryClick(name);
        }
      },
    });
  }

  return (
    <GeoJSON
      key={layerKey}
      ref={layerRef}
      data={geoData}
      style={(feature) => countryStyle(feature, selectedCountry)}
      onEachFeature={onEachFeature}
    />
  );
}

// One circle marker per event, colored by Goldstein-derived tone. Rows
// without usable coordinates (rare, but GDELT geocoding isn't perfect) are
// skipped rather than plotted at 0,0.
function EventMarkers({ events, onEventClick }) {
  return events
    .filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon))
    .map((event) => (
      <CircleMarker
        key={event.id}
        center={[event.lat, event.lon]}
        radius={5}
        pathOptions={{
          color: TONE_HEX[toneCategory(event.goldstein)],
          fillColor: TONE_HEX[toneCategory(event.goldstein)],
          fillOpacity: 0.7,
          weight: 1.5,
        }}
        eventHandlers={{ click: () => onEventClick(event) }}
      />
    ));
}

export default function WorldMap({
  selectedCountry,
  onCountryClick,
  events = [],
  onEventClick,
}) {
  const [geoData, setGeoData] = useState(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    let canceled = false;
    loadCountriesGeoJson()
      .then((data) => {
        if (!canceled) {
          setGeoData(data);
          setGeoError(false);
        }
      })
      .catch(() => {
        if (!canceled) setGeoError(true);
      });
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[20, 10]}
        zoom={window.innerWidth < 768 ? 2 : 2.5}
        minZoom={2}
        maxZoom={10}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={true}
        worldCopyJump={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {/* top-left is covered by the HUD */}
        <ZoomControl position="bottomright" />
        {geoData && (
          <GeoJSONLayer
            geoData={geoData}
            selectedCountry={selectedCountry}
            onCountryClick={onCountryClick}
          />
        )}
        <Pane name="events" style={{ zIndex: 450 }}>
          <EventMarkers events={events} onEventClick={onEventClick} />
        </Pane>
      </MapContainer>

      {/* GeoJSON loading overlay */}
      {!geoData && !geoError && (
        <div className="absolute bottom-12 left-3 z-[999] flex items-center gap-2 bg-carbon-900/90 border border-carbon-800 rounded-full px-3 py-1 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" />
          <span className="text-2xs text-carbon-300">Loading borders…</span>
        </div>
      )}
      {geoError && (
        <div className="absolute bottom-12 left-3 z-[999] bg-carbon-900/90 border border-signal-red/30 rounded-lg px-3 py-1.5 backdrop-blur-md">
          <span className="text-2xs text-signal-red">
            Failed to load country borders (check
            /public/data/countries.geojson)
          </span>
        </div>
      )}
    </div>
  );
}
