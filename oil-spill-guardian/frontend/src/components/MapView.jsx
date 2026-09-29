import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  Polygon,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

// Fix Leaflet standard icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function MapView({
  vessels = [],
  spills = [],
  activeSpillId,
  onSelectSpill,
  alerts = [],
  center = [19.05, 72.85],
}) {
  const [showSpills, setShowSpills] = useState(true);
  const [showAis, setShowAis] = useState(true);
  const [showDrift, setShowDrift] = useState(true);
  const [sarOverlay, setSarOverlay] = useState(false);

  const activeSpill =
    spills.find((s) => (s.spill_code || s.id) === activeSpillId) ||
    spills[0];

  const suspectMmsis = alerts.map((a) => a.vessel_mmsi);

  // Generate buffer zone polygon around drift points
  const getDriftZonePolygon = (driftPts) => {
    if (!driftPts || driftPts.length < 3) return null;
    const p0 = driftPts[0];
    const p2 = driftPts[Math.floor(driftPts.length / 2)];
    const pLast = driftPts[driftPts.length - 1];

    return [
      [p0[0] + 0.03, p0[1] - 0.02],
      [p2[0] + 0.03, p2[1] + 0.02],
      [pLast[0] + 0.02, pLast[1] + 0.03],
      [pLast[0] - 0.03, pLast[1] + 0.02],
      [p2[0] - 0.03, p2[1] - 0.02],
      [p0[0] - 0.02, p0[1] - 0.02],
    ];
  };

  return (
    <div className="map-wrapper">
      {/* Floating Toolbar */}
      <div className="toolbar">
        <button
          className={showSpills ? "active" : ""}
          onClick={() => setShowSpills((v) => !v)}
        >
          Spills
        </button>
        <button
          className={showAis ? "active" : ""}
          onClick={() => setShowAis((v) => !v)}
        >
          AIS Tracks
        </button>
        <button
          className={showDrift ? "active" : ""}
          onClick={() => setShowDrift((v) => !v)}
        >
          Drift Prediction
        </button>
        <button
          className={sarOverlay ? "active" : ""}
          onClick={() => setSarOverlay((v) => !v)}
        >
          SAR Overlay
        </button>
      </div>

      <div
        id="map"
        style={{
          filter: sarOverlay ? "grayscale(0.75) contrast(1.2)" : "none",
          transition: "filter 0.3s ease",
          height: "100%",
          width: "100%",
        }}
      >
        <MapContainer
          center={center}
          zoom={9}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; CartoDB"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Render Detected Oil Spills */}
          {showSpills &&
            spills.map((spill) => {
              const code = spill.spill_code || `SPL-${spill.id}`;
              const isActive = (spill.spill_code || spill.id) === activeSpillId;

              // Parse coordinates: GeoJSON standard is [lon, lat], Leaflet wants [lat, lon]
              const coords =
                spill.polygon_geojson?.coordinates?.[0]?.map((pt) => {
                  if (typeof pt === "string") {
                    const [lonStr, latStr] = pt.split(" ");
                    return [parseFloat(latStr), parseFloat(lonStr)];
                  }
                  return [pt[1], pt[0]];
                }) || [];

              const centroid = [spill.centroid_lat, spill.centroid_lon];

              return (
                <div key={spill.id}>
                  {coords.length > 0 && (
                    <Polygon
                      positions={coords}
                      eventHandlers={{
                        click: () => onSelectSpill(spill.spill_code || spill.id),
                      }}
                      pathOptions={{
                        color: "#ff3b30",
                        weight: isActive ? 2.5 : 1,
                        opacity: isActive ? 0.95 : 0.5,
                        fillColor: "#ff3b30",
                        fillOpacity: isActive ? 0.45 : 0.2,
                        dashArray: isActive ? null : "4 4",
                      }}
                    >
                      <Popup>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#ff5c52" }}>
                          {code}
                        </div>
                        <div>Scene: {spill.source_image || "Sentinel-1"}</div>
                        <div>
                          Confidence:{" "}
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>
                            {spill.confidence
                              ? (spill.confidence * 100).toFixed(0) + "%"
                              : "94%"}
                          </span>
                        </div>
                        <div>Area: {spill.area_km2 || 18.7} km²</div>
                        <div>Severity: {spill.severity || "critical"}</div>
                      </Popup>
                    </Polygon>
                  )}

                  {/* Spill centroid marker */}
                  <CircleMarker
                    center={centroid}
                    radius={isActive ? 6 : 4}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.5,
                      fillColor: "#ff3b30",
                      fillOpacity: 1,
                    }}
                    eventHandlers={{
                      click: () => onSelectSpill(spill.spill_code || spill.id),
                    }}
                  />
                </div>
              );
            })}

          {/* Render Drift Prediction for Active Spill */}
          {showDrift && activeSpill && activeSpill.drift_geojson && (
            <>
              {/* Drift center trajectory */}
              <Polyline
                positions={activeSpill.drift_geojson}
                pathOptions={{
                  color: "#ff5c52",
                  weight: 2,
                  opacity: 0.85,
                  dashArray: "6 6",
                }}
              />

              {/* Drift buffer ellipse corridor */}
              {getDriftZonePolygon(activeSpill.drift_geojson) && (
                <Polygon
                  positions={getDriftZonePolygon(activeSpill.drift_geojson)}
                  pathOptions={{
                    color: "#ff5c52",
                    weight: 1,
                    dashArray: "3 5",
                    fillColor: "#ff3b30",
                    fillOpacity: 0.15,
                  }}
                />
              )}
            </>
          )}

          {/* Render AIS Tracks & Vessels */}
          {showAis &&
            vessels.map((v) => {
              const isSuspect = suspectMmsis.includes(v.mmsi);
              const color = v.dark
                ? "#ff3b30"
                : isSuspect
                ? "#facc15"
                : "#00e5ff";

              const track =
                v.track_geojson || [
                  [v.lat - 0.05, v.lon - 0.05],
                  [v.lat, v.lon],
                ];
              const headPos = track[track.length - 1] || [v.lat, v.lon];

              return (
                <div key={v.mmsi || v.id}>
                  {/* AIS Trajectory Polyline */}
                  <Polyline
                    positions={track}
                    pathOptions={{
                      color: color,
                      weight: isSuspect ? 3 : 2,
                      opacity: v.dark ? 1 : 0.75,
                      dashArray: v.dark ? "5 5" : null,
                    }}
                  />

                  {/* Current Vessel Position Marker */}
                  <CircleMarker
                    center={headPos}
                    radius={5}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.5,
                      fillColor: color,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>
                        {v.name || "Unknown Vessel"}
                      </div>
                      <div>MMSI: {v.mmsi}</div>
                      <div>
                        Type: {v.vessel_type || "Unknown"} &middot; Flag: {v.flag || "UN"}
                      </div>
                      <div>
                        Speed: {v.speed_knots} kn &middot; Course: {v.course_deg}°
                      </div>
                      {v.dark && (
                        <div
                          style={{
                            color: "#ff5c52",
                            fontWeight: 700,
                            marginTop: "4px",
                          }}
                        >
                          ⚠ AIS GAP DETECTED
                        </div>
                      )}
                    </Popup>
                  </CircleMarker>

                  {/* Dark Vessel AIS Gap Marker */}
                  {v.dark && v.gap_at !== null && v.gap_at < track.length && (
                    <CircleMarker
                      center={track[v.gap_at]}
                      radius={8}
                      pathOptions={{
                        color: "#ff3b30",
                        weight: 2,
                        fillColor: "#ff3b30",
                        fillOpacity: 0.25,
                      }}
                    >
                      <Popup>
                        <div style={{ color: "#ff5c52", fontWeight: 700 }}>
                          ⚠ AIS Signal Lost
                        </div>
                        <div>Vessel went dark here for ~4h 12m</div>
                      </Popup>
                    </CircleMarker>
                  )}
                </div>
              );
            })}
        </MapContainer>
      </div>

      {/* Floating Legend */}
      <div className="legend">
        <div>
          <div className="swatch" style={{ background: "#ff3b30", opacity: 0.6 }}></div>
          <span>Detected Oil Spill</span>
        </div>
        <div>
          <div
            className="swatch"
            style={{
              background: "#ff3b30",
              opacity: 0.25,
              border: "1px dashed #ff5c52",
            }}
          ></div>
          <span>Predicted Drift Zone</span>
        </div>
        <div>
          <div className="line" style={{ background: "#00e5ff" }}></div>
          <span>AIS Vessel Track</span>
        </div>
        <div>
          <div
            className="line"
            style={{ background: "#ff3b30", borderTop: "2px dashed #ff3b30" }}
          ></div>
          <span>Suspect Track</span>
        </div>
      </div>
    </div>
  );
}
