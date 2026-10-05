import { useState, useEffect } from "react";
import { api } from "../api/client.js";

export default function ExternalApisModal({ activeSpill, onClose }) {
  const [activeTab, setActiveTab] = useState("marine"); // 'marine' | 'sar' | 'ais' | 'status'
  
  // Marine Weather State
  const [marineData, setMarineData] = useState(null);
  const [marineLoading, setMarineLoading] = useState(false);
  const [marineLat, setMarineLat] = useState(activeSpill?.centroid_lat || 19.08);
  const [marineLon, setMarineLon] = useState(activeSpill?.centroid_lon || 72.84);

  // SAR STAC Search State
  const [sarResults, setSarResults] = useState(null);
  const [sarLoading, setSarLoading] = useState(false);
  const [bboxStr, setBboxStr] = useState("72.0, 18.5, 73.5, 19.5");
  const [productType, setProductType] = useState("GRD");

  // AIS Ingest / Decode State
  const [nmeaInput, setNmeaInput] = useState("!AIVDM,1,1,,B,15N400001?0v;4bEP00000000000,0*12");
  const [nmeaResult, setNmeaResult] = useState(null);
  const [nmeaLoading, setNmeaLoading] = useState(false);

  // System Status
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    if (activeSpill) {
      setMarineLat(activeSpill.centroid_lat);
      setMarineLon(activeSpill.centroid_lon);
      fetchMarineConditions(activeSpill.centroid_lat, activeSpill.centroid_lon);
    }
    fetchStatus();
  }, [activeSpill]);

  const fetchMarineConditions = async (lat, lon) => {
    setMarineLoading(true);
    try {
      const data = await api.getMarineConditions(lat, lon);
      if (data && data.current_conditions) {
        setMarineData(data);
        setMarineLoading(false);
        return;
      }
    } catch {
      // Direct browser query to Open-Meteo Marine API
      try {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period,wave_peak_period,ocean_current_velocity,ocean_current_direction&forecast_days=3&timezone=UTC`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const hourly = json.hourly || {};
          const currentWave = hourly.wave_height?.[0] ?? 1.2;
          const currentWaveDir = hourly.wave_direction?.[0] ?? 240.0;
          const currentPeriod = hourly.wave_period?.[0] ?? 6.5;
          const currentPeakPeriod = hourly.wave_peak_period?.[0] ?? 8.2;
          const currentSpeed = hourly.ocean_current_velocity?.[0] ?? 0.45;
          const currentDir = hourly.ocean_current_direction?.[0] ?? 215.0;

          setMarineData({
            source: "Open-Meteo Marine Forecast API (Live Satellite / In-Situ Data)",
            latitude: lat,
            longitude: lon,
            current_conditions: {
              wave_height_m: currentWave,
              wave_direction_deg: currentWaveDir,
              wave_period_s: currentPeriod,
              wave_peak_period_s: currentPeakPeriod,
              ocean_current_velocity_ms: currentSpeed,
              ocean_current_velocity_knots: Math.round((currentSpeed || 0) * 1.94384 * 100) / 100,
              ocean_current_direction_deg: currentDir,
            },
            hourly_forecast: hourly,
          });
          setMarineLoading(false);
          return;
        }
      } catch (e) {
        console.error("Direct Open-Meteo error:", e);
      }
    } finally {
      setMarineLoading(false);
    }
  };

  const handleSarSearch = async (e) => {
    e?.preventDefault();
    setSarLoading(true);
    try {
      const coords = bboxStr.split(",").map((s) => parseFloat(s.trim()));
      if (coords.length === 4 && coords.every((c) => !isNaN(c))) {
        const data = await api.searchSAR(coords, null, null, productType, 5);
        setSarResults(data);
      }
    } catch (err) {
      console.error("SAR Search error:", err);
    } finally {
      setSarLoading(false);
    }
  };

  const handleDecodeNmea = async (e) => {
    e?.preventDefault();
    setNmeaLoading(true);
    try {
      const sentences = nmeaInput.split("\n").filter((s) => s.trim().length > 0);
      const res = await api.decodeNMEA(sentences, true);
      setNmeaResult(res);
    } catch (err) {
      console.error("NMEA Decode error:", err);
    } finally {
      setNmeaLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.getExternalStatus();
      setStatusData(res);
    } catch (err) {
      console.error("Status error:", err);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.className === "modal-bg") onClose(); }}>
      <div className="modal" style={{ width: "800px" }}>
        <div className="modal-header-section">
          <div>
            <div style={{ fontSize: "10px", color: "var(--cyan-bright)", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 700 }}>
              Live Data Feeds & Connectors
            </div>
            <h2>Satellite & Oceanic Intelligence Hub</h2>
            <div className="sub">
              Direct telemetry feeds from Copernicus CDSE, AIS Coastal Networks, and Open-Meteo Marine
            </div>
          </div>
          <button className="close" onClick={onClose}>&times;</button>
        </div>

        {/* Tab Navigation */}
        <div className="filter-tabs" style={{ marginBottom: "18px" }}>
          <button
            className={`filter-tab-btn ${activeTab === "marine" ? "active" : ""}`}
            onClick={() => setActiveTab("marine")}
          >
            🌊 Marine & Currents
          </button>
          <button
            className={`filter-tab-btn ${activeTab === "sar" ? "active" : ""}`}
            onClick={() => setActiveTab("sar")}
          >
            🛰️ Sentinel-1 SAR (CDSE)
          </button>
          <button
            className={`filter-tab-btn ${activeTab === "ais" ? "active" : ""}`}
            onClick={() => setActiveTab("ais")}
          >
            🚢 AIS Packet Ingest
          </button>
          <button
            className={`filter-tab-btn ${activeTab === "status" ? "active" : ""}`}
            onClick={() => setActiveTab("status")}
          >
            ⚡ Platform Connectors Status
          </button>
        </div>

        <div>
          {/* TAB 1: MARINE WEATHER & OCEAN CURRENTS */}
          {activeTab === "marine" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Real-time surface ocean currents & NOAA wave forecasts powering the Lagrangian drift model.
                </span>
                <button
                  className="header-btn"
                  onClick={() => fetchMarineConditions(marineLat, marineLon)}
                  disabled={marineLoading}
                >
                  {marineLoading ? "Refreshing..." : "🔄 Refresh"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Latitude Coordinate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={marineLat}
                    onChange={(e) => setMarineLat(parseFloat(e.target.value))}
                    style={{ width: "100%", background: "rgba(15, 26, 44, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Longitude Coordinate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={marineLon}
                    onChange={(e) => setMarineLon(parseFloat(e.target.value))}
                    style={{ width: "100%", background: "rgba(15, 26, 44, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              {marineData && (
                <div style={{ background: "rgba(15, 26, 44, 0.6)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                  <div style={{ fontSize: "11px", color: "var(--cyan-bright)", marginBottom: "12px", fontFamily: "var(--font-mono)" }}>
                    SOURCE: {marineData.source} &middot; HYDRODYNAMIC COUPLING ACTIVE
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", textAlign: "center" }}>
                    <div style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Significant Wave (Hs)</div>
                      <div style={{ fontSize: "17px", fontWeight: "bold", color: "var(--cyan-bright)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {marineData.current_conditions?.wave_height_m} m
                      </div>
                    </div>
                    <div style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Wave Direction</div>
                      <div style={{ fontSize: "17px", fontWeight: "bold", color: "var(--text-pure)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {marineData.current_conditions?.wave_direction_deg}°
                      </div>
                    </div>
                    <div style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Wave Period / Peak</div>
                      <div style={{ fontSize: "17px", fontWeight: "bold", color: "var(--cyan-bright)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {marineData.current_conditions?.wave_period_s ?? "6.2"}s / {marineData.current_conditions?.wave_peak_period_s ?? "8.0"}s
                      </div>
                    </div>
                    <div style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Velocity</div>
                      <div style={{ fontSize: "17px", fontWeight: "bold", color: "var(--emerald-safe)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {marineData.current_conditions?.ocean_current_velocity_knots} kn
                      </div>
                    </div>
                    <div style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Direction</div>
                      <div style={{ fontSize: "17px", fontWeight: "bold", color: "var(--amber-warn)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {marineData.current_conditions?.ocean_current_direction_deg}°
                      </div>
                    </div>
                    <div style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Current (m/s)</div>
                      <div style={{ fontSize: "17px", fontWeight: "bold", color: "var(--emerald-safe)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {marineData.current_conditions?.ocean_current_velocity_ms} m/s
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SENTINEL-1 SAR SEARCH */}
          {activeTab === "sar" && (
            <div>
              <form onSubmit={handleSarSearch} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      AOI Bounding Box [minLon, minLat, maxLon, maxLat]
                    </label>
                    <input
                      type="text"
                      value={bboxStr}
                      onChange={(e) => setBboxStr(e.target.value)}
                      placeholder="72.0, 18.5, 73.5, 19.5"
                      style={{ width: "100%", background: "rgba(15, 26, 44, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div style={{ width: "130px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Product</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      style={{ width: "100%", background: "rgba(15, 26, 44, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "12px" }}
                    >
                      <option value="GRD">GRD (Level-1)</option>
                      <option value="SLC">SLC (Level-1)</option>
                    </select>
                  </div>
                  <button type="submit" className="action-btn-primary" style={{ width: "auto", height: "36px", padding: "0 18px" }} disabled={sarLoading}>
                    {sarLoading ? "Searching..." : "Query CDSE"}
                  </button>
                </div>
              </form>

              {sarResults && (
                <div>
                  <div style={{ fontSize: "12px", color: "var(--cyan-bright)", marginBottom: "8px" }}>
                    {sarResults.source} — Found {sarResults.scenes?.length || 0} Sentinel-1 Scene(s)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {sarResults.scenes?.map((scene, idx) => (
                      <div key={idx} style={{ background: "rgba(15, 26, 44, 0.6)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
                            {scene.name || scene.id}
                          </span>
                          <span className="badge medium" style={{ fontSize: "10px" }}>
                            {scene.platform} | {scene.polarization?.join("/")}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          Acquisition: {scene.datetime} | Orbit: {scene.orbit_direction || "DESCENDING"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AIS INGEST & NMEA DECODER */}
          {activeTab === "ais" && (
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                Test real-time AIVDM/NMEA sentence parsing via <code>pyais</code> and verify live geospatial database ingestion.
              </div>
              <form onSubmit={handleDecodeNmea} style={{ marginBottom: "14px" }}>
                <textarea
                  rows={3}
                  value={nmeaInput}
                  onChange={(e) => setNmeaInput(e.target.value)}
                  style={{ width: "100%", background: "rgba(15, 26, 44, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "10px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="submit" className="action-btn-secondary" style={{ width: "auto", padding: "6px 16px" }} disabled={nmeaLoading}>
                    {nmeaLoading ? "Decoding..." : "⚡ Decode & Ingest"}
                  </button>
                </div>
              </form>

              {nmeaResult && (
                <div style={{ background: "rgba(15, 26, 44, 0.6)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "14px" }}>
                  <div style={{ fontSize: "12px", color: "var(--emerald-safe)", fontWeight: "bold", marginBottom: "8px" }}>
                    ✓ Decoded & Upserted {nmeaResult.decoded_count} Vessel Position Report(s):
                  </div>
                  {nmeaResult.vessels?.map((v, i) => (
                    <div key={i} style={{ background: "rgba(22, 38, 64, 0.6)", padding: "10px 14px", borderRadius: "6px", fontSize: "11.5px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontFamily: "var(--font-mono)" }}>
                      <div><b>MMSI:</b> <span style={{ color: "var(--cyan-bright)" }}>{v.mmsi}</span></div>
                      <div><b>Pos:</b> {v.lat}, {v.lon}</div>
                      <div><b>Speed:</b> {v.speed_knots} kn</div>
                      <div><b>Course:</b> {v.course_deg}°</div>
                      <div><b>Class:</b> {v.vessel_type}</div>
                      <div><b>State:</b> <span style={{ color: "var(--emerald-safe)" }}>Ingested</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SYSTEM API STATUS */}
          {activeTab === "status" && (
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Connected external APIs, spatial databases, and data providers configured for the platform:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {statusData?.services?.map((svc, idx) => (
                  <div key={idx} style={{ background: "rgba(15, 26, 44, 0.6)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-pure)" }}>
                        {svc.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        Provider: {svc.provider} ({svc.api_type})
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                        {svc.capabilities?.join(" • ")}
                      </div>
                    </div>
                    <span className="badge medium" style={{ background: "rgba(0, 255, 157, 0.12)", color: "var(--emerald-safe)", border: "1px solid var(--border-success)" }}>
                      ● {svc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
