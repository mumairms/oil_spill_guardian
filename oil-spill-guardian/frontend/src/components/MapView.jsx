import { useState, useMemo, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  CircleMarker,
  Popup,
  Polygon,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// Create High-Tech Directional Vessel Icon
const createVesselIcon = (vessel, isSuspect) => {
  const isDark = vessel.dark;
  const course = vessel.course_deg || 0;
  const color = isDark
    ? "#ff3b5c"
    : isSuspect
    ? "#ffb020"
    : "#00f0ff";

  const glowColor = isDark
    ? "rgba(255, 59, 92, 0.6)"
    : isSuspect
    ? "rgba(255, 176, 32, 0.5)"
    : "rgba(0, 240, 255, 0.4)";

  const svgHtml = `
    <div style="transform: rotate(${course}deg); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; position: relative;">
      ${
        isDark
          ? `<div style="position: absolute; inset: -4px; border-radius: 50%; border: 1.5px dashed #ff3b5c; animation: pulse-blip 1.5s infinite;"></div>`
          : `<div style="position: absolute; inset: -2px; border-radius: 50%; border: 1px solid rgba(0, 240, 255, 0.3); animation: pulse-blip 3s infinite;"></div>`
      }
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 0 6px ${glowColor});">
        <!-- Vessel Hull Arrow -->
        <path d="M12 2L20 20L12 16L4 20L12 2Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" />
        <circle cx="12" cy="11" r="2.5" fill="#070d18" stroke="${color}" stroke-width="1" />
      </svg>
    </div>
  `;

  return L.divIcon({
    className: "custom-vessel-marker",
    html: svgHtml,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// Coordinate Tracker Component
function CoordinatesTracker({ onMove }) {
  useMapEvents({
    mousemove(e) {
      if (onMove) {
        onMove({
          lat: e.latlng.lat.toFixed(4),
          lng: e.latlng.lng.toFixed(4),
        });
      }
    },
  });
  return null;
}

// Map Auto Center Controller
function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function MapView({
  vessels: initialVessels = [],
  spills = [],
  activeSpillId,
  onSelectSpill,
  alerts = [],
  center = [15.48, 65.84],
}) {
  const [showSpills, setShowSpills] = useState(true);
  const [showAis, setShowAis] = useState(true);
  const [showDrift, setShowDrift] = useState(true);
  const [showRangeRings, setShowRangeRings] = useState(true);
  const [sarOverlay, setSarOverlay] = useState(false);
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [coords, setCoords] = useState({ lat: "15.4800", lng: "65.8400" });
  const [liveVessels, setLiveVessels] = useState(initialVessels);
  const [lastPacketInfo, setLastPacketInfo] = useState("Ingesting High-Frequency AIS Stream from Arabian Sea High-Seas Sector");

  // Keep liveVessels in sync if initialVessels change
  useEffect(() => {
    setLiveVessels(initialVessels);
  }, [initialVessels]);

  // Real-Time Live Vessel Movement Simulation Loop (Advances every 2s)
  useEffect(() => {
    if (!isLiveStream) return;

    const interval = setInterval(() => {
      setLiveVessels((prevVessels) => {
        return prevVessels.map((v) => {
          // Speed to distance factor (small delta per 2s interval)
          const speed = v.speed_knots || 10;
          const courseRad = ((v.course_deg || 0) * Math.PI) / 180;
          const deltaLat = (Math.cos(courseRad) * (speed * 0.00015));
          const deltaLon = (Math.sin(courseRad) * (speed * 0.00015));

          const newLat = +(v.lat + deltaLat).toFixed(5);
          const newLon = +(v.lon + deltaLon).toFixed(5);

          const existingTrack = v.track_geojson || [[v.lat, v.lon]];
          const updatedTrack = [...existingTrack.slice(-20), [newLat, newLon]];

          return {
            ...v,
            lat: newLat,
            lon: newLon,
            track_geojson: updatedTrack,
          };
        });
      });

      // Update ticker packet
      if (liveVessels.length > 0) {
        const randomV = liveVessels[Math.floor(Math.random() * liveVessels.length)];
        setLastPacketInfo(
          `[LIVE AIS] MMSI ${randomV.mmsi} (${randomV.name}) &middot; Pos: ${randomV.lat}°N, ${randomV.lon}°E &middot; SOG: ${randomV.speed_knots} kn &middot; COG: ${randomV.course_deg}°`
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveStream, liveVessels]);

  const activeSpill = useMemo(() => {
    return (
      spills.find((s) => (s.spill_code || s.id) === activeSpillId) ||
      spills[0]
    );
  }, [spills, activeSpillId]);

  const suspectMmsis = useMemo(() => alerts.map((a) => a.vessel_mmsi), [alerts]);

  const getDriftZonePolygon = (driftPts) => {
    if (!driftPts || driftPts.length < 3) return null;
    const p0 = driftPts[0];
    const p2 = driftPts[Math.floor(driftPts.length / 2)];
    const pLast = driftPts[driftPts.length - 1];

    return [
      [p0[0] + 0.05, p0[1] - 0.04],
      [p2[0] + 0.06, p2[1] + 0.04],
      [pLast[0] + 0.04, pLast[1] + 0.06],
      [pLast[0] - 0.05, pLast[1] + 0.04],
      [p2[0] - 0.05, p2[1] - 0.04],
      [p0[0] - 0.04, p0[1] - 0.04],
    ];
  };

  const activeCentroid = activeSpill
    ? [activeSpill.centroid_lat, activeSpill.centroid_lon]
    : center;

  return (
    <div className="map-wrapper">
      {/* Live High-Frequency AIS Ticker Banner */}
      <div style={{
        position: "absolute",
        top: "12px",
        right: "16px",
        zIndex: 1000,
        background: "rgba(11, 18, 30, 0.9)",
        border: "1px solid rgba(0, 240, 255, 0.3)",
        borderRadius: "20px",
        padding: "5px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "11px",
        color: "var(--cyan-bright)",
        fontFamily: "var(--font-mono)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 0 15px rgba(0, 240, 255, 0.15)"
      }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 8px #00ff9d", animation: "pulse-blip 1s infinite" }}></div>
        <span dangerouslySetInnerHTML={{ __html: lastPacketInfo }} />
      </div>

      {/* Floating Tactical Map Toolbar */}
      <div className="tactical-map-toolbar">
        <button
          className={`toolbar-btn ${showSpills ? "active" : ""}`}
          onClick={() => setShowSpills((v) => !v)}
        >
          <span>🛰️</span> Spills ({spills.length})
        </button>
        <button
          className={`toolbar-btn ${showAis ? "active" : ""}`}
          onClick={() => setShowAis((v) => !v)}
        >
          <span>🚢</span> Live AIS ({liveVessels.length})
        </button>
        <button
          className={`toolbar-btn ${showDrift ? "active" : ""}`}
          onClick={() => setShowDrift((v) => !v)}
        >
          <span>🌊</span> Drift Forecast
        </button>
        <button
          className={`toolbar-btn ${showRangeRings ? "active" : ""}`}
          onClick={() => setShowRangeRings((v) => !v)}
        >
          <span>🎯</span> Range Rings
        </button>
        <button
          className={`toolbar-btn ${sarOverlay ? "active" : ""}`}
          onClick={() => setSarOverlay((v) => !v)}
        >
          <span>👁️</span> {sarOverlay ? "SAR Satellite" : "Base Vector"}
        </button>
        <button
          className={`toolbar-btn ${isLiveStream ? "active" : ""}`}
          style={{ borderColor: isLiveStream ? "#00ff9d" : "transparent", color: isLiveStream ? "#00ff9d" : "var(--text-muted)" }}
          onClick={() => setIsLiveStream(!isLiveStream)}
          title="Toggle Real-time vessel movement animation"
        >
          <span>{isLiveStream ? "▶ Live: ON" : "⏸ Paused"}</span>
        </button>
      </div>

      <div
        id="map"
        style={{
          filter: sarOverlay ? "contrast(1.15) brightness(0.95)" : "none",
          transition: "filter 0.3s ease",
          height: "100%",
          width: "100%",
        }}
      >
        <MapContainer
          center={activeCentroid}
          zoom={9}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <MapAutoCenter center={activeCentroid} />
          <CoordinatesTracker onMove={setCoords} />

          {sarOverlay ? (
            <TileLayer
              attribution="&copy; Esri World Imagery"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          ) : (
            <>
              <TileLayer
                attribution="&copy; Esri Canvas Dark Base"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                maxZoom={16}
              />
              <TileLayer
                attribution="&copy; Esri Canvas Reference"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={16}
              />
            </>
          )}

          {/* Intercept Range Rings around Active Spill (5km, 15km, 30km) */}
          {showRangeRings && activeSpill && (
            <>
              <Circle
                center={activeCentroid}
                radius={5000}
                pathOptions={{
                  color: "rgba(255, 59, 92, 0.7)",
                  weight: 1.5,
                  dashArray: "4 6",
                  fill: false,
                }}
              />
              <Circle
                center={activeCentroid}
                radius={15000}
                pathOptions={{
                  color: "rgba(0, 240, 255, 0.4)",
                  weight: 1.2,
                  dashArray: "5 8",
                  fill: false,
                }}
              />
              <Circle
                center={activeCentroid}
                radius={30000}
                pathOptions={{
                  color: "rgba(148, 169, 201, 0.25)",
                  weight: 0.8,
                  dashArray: "8 12",
                  fill: false,
                }}
              />
            </>
          )}

          {/* Render Detected Oil Spills */}
          {showSpills &&
            spills.map((spill) => {
              const code = spill.spill_code || `SPL-${spill.id}`;
              const isActive = (spill.spill_code || spill.id) === activeSpillId;

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
                        color: "#ff3b5c",
                        weight: isActive ? 3 : 1.5,
                        opacity: isActive ? 1 : 0.6,
                        fillColor: "#ff3b5c",
                        fillOpacity: isActive ? 0.45 : 0.2,
                        dashArray: isActive ? null : "4 4",
                      }}
                    >
                      <Popup>
                        <div className="popup-title">
                          <span style={{ color: "#ff3b5c" }}>🚨 {code}</span>
                          <span className={`badge ${spill.severity || "critical"}`}>
                            {spill.severity || "critical"}
                          </span>
                        </div>
                        <table className="popup-table">
                          <tbody>
                            <tr>
                              <td>Sensor Source</td>
                              <td className="val">{spill.source_image || "Sentinel-1 SAR (IW)"}</td>
                            </tr>
                            <tr>
                              <td>Confidence Score</td>
                              <td className="val" style={{ color: "#00ff9d" }}>
                                {spill.confidence
                                  ? (spill.confidence * 100).toFixed(0) + "%"
                                  : "96%"}
                              </td>
                            </tr>
                            <tr>
                              <td>Estimated Slick Area</td>
                              <td className="val">{spill.area_km2 || 24.5} km²</td>
                            </tr>
                            <tr>
                              <td>Centroid Coordinates</td>
                              <td className="val">
                                {spill.centroid_lat.toFixed(3)}°N, {spill.centroid_lon.toFixed(3)}°E
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </Popup>
                    </Polygon>
                  )}

                  {/* Centroid Reticle Marker */}
                  <CircleMarker
                    center={centroid}
                    radius={isActive ? 7 : 4}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 2,
                      fillColor: "#ff3b5c",
                      fillOpacity: 1,
                    }}
                    eventHandlers={{
                      click: () => onSelectSpill(spill.spill_code || spill.id),
                    }}
                  />
                </div>
              );
            })}

          {/* Drift Prediction for Active Spill */}
          {showDrift && activeSpill && activeSpill.drift_geojson && (
            <>
              <Polyline
                positions={activeSpill.drift_geojson}
                pathOptions={{
                  color: "#ff3b5c",
                  weight: 2.5,
                  opacity: 0.9,
                  dashArray: "6 6",
                }}
              />

              {getDriftZonePolygon(activeSpill.drift_geojson) && (
                <Polygon
                  positions={getDriftZonePolygon(activeSpill.drift_geojson)}
                  pathOptions={{
                    color: "#ff3b5c",
                    weight: 1,
                    dashArray: "3 5",
                    fillColor: "#ff3b5c",
                    fillOpacity: 0.14,
                  }}
                />
              )}
            </>
          )}

          {/* Render Live Moving AIS Vessels */}
          {showAis &&
            liveVessels.map((v) => {
              const isSuspect = suspectMmsis.includes(v.mmsi);
              const color = v.dark
                ? "#ff3b5c"
                : isSuspect
                ? "#ffb020"
                : "#00f0ff";

              const track =
                v.track_geojson || [
                  [v.lat - 0.05, v.lon - 0.05],
                  [v.lat, v.lon],
                ];
              const headPos = track[track.length - 1] || [v.lat, v.lon];

              return (
                <div key={v.mmsi || v.id}>
                  {/* AIS Past Track Polyline */}
                  <Polyline
                    positions={track}
                    pathOptions={{
                      color: color,
                      weight: isSuspect ? 3 : 1.8,
                      opacity: v.dark ? 1 : 0.7,
                      dashArray: v.dark ? "4 4" : null,
                    }}
                  />

                  {/* Directional Moving Vessel Marker */}
                  <Marker
                    position={headPos}
                    icon={createVesselIcon(v, isSuspect)}
                  >
                    <Popup>
                      <div className="popup-title">
                        <span>🚢 {v.name || "Target Vessel"}</span>
                        {v.dark && <span className="badge critical">DARK VESSEL</span>}
                      </div>
                      <table className="popup-table">
                        <tbody>
                          <tr>
                            <td>MMSI Identifier</td>
                            <td className="val">{v.mmsi}</td>
                          </tr>
                          <tr>
                            <td>Vessel Classification</td>
                            <td className="val">{v.vessel_type || "Tanker"} ({v.flag || "INTL"})</td>
                          </tr>
                          <tr>
                            <td>Current Speed / Heading</td>
                            <td className="val" style={{ color: "#00f0ff" }}>
                              {v.speed_knots} kn &middot; {v.course_deg}°
                            </td>
                          </tr>
                          <tr>
                            <td>Coordinates</td>
                            <td className="val">{headPos[0]?.toFixed(4)}°N, {headPos[1]?.toFixed(4)}°E</td>
                          </tr>
                          {v.dark && (
                            <tr>
                              <td colSpan="2" style={{ color: "#ff3b5c", fontWeight: 700, paddingTop: "6px" }}>
                                ⚠ Transponder Gapped (~4h 12m)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </Popup>
                  </Marker>
                </div>
              );
            })}
        </MapContainer>
      </div>

      {/* Floating Tactical Legend */}
      <div className="tactical-legend">
        <div className="tactical-legend-title">Tactical Layer Index</div>
        <div className="legend-row">
          <div className="legend-swatch" style={{ background: "#ff3b5c", opacity: 0.8 }}></div>
          <span>Confirmed Spill Boundary</span>
        </div>
        <div className="legend-row">
          <div
            className="legend-swatch"
            style={{
              background: "#ff3b5c",
              opacity: 0.25,
              border: "1px dashed #ff3b5c",
            }}
          ></div>
          <span>Drift Dispersion Corridor</span>
        </div>
        <div className="legend-row">
          <div className="legend-line" style={{ background: "#00f0ff" }}></div>
          <span>Active AIS Merchant Track</span>
        </div>
        <div className="legend-row">
          <div className="legend-line" style={{ background: "#ff3b5c", borderTop: "2px dashed #ff3b5c" }}></div>
          <span>Suspect / Dark Vessel Track</span>
        </div>
      </div>

      {/* Real-time Coordinate Reticle Display */}
      <div className="map-coordinate-hud">
        <span>📍 POS:</span>
        <span>{coords.lat}°N, {coords.lng}°E</span>
        <span style={{ color: "#94a9c9" }}>&middot; DATUM WGS-84</span>
      </div>
    </div>
  );
}
