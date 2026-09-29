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

  // Load initial marine data for active spill
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
      setMarineData(data);
    } catch (err) {
      console.error("Marine API error:", err);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "750px", width: "92%" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: "11px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Live Data Ingest & Connectors
            </div>
            <h2 style={{ margin: "2px 0 0 0", fontSize: "18px" }}>Satellite & Oceanic APIs Hub</h2>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #334155", padding: "10px 16px", background: "#0b1220" }}>
          <button
            className={`btn ${activeTab === "marine" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => setActiveTab("marine")}
          >
            🌊 Marine & Currents (Open-Meteo)
          </button>
          <button
            className={`btn ${activeTab === "sar" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => setActiveTab("sar")}
          >
            🛰️ Sentinel-1 SAR (CDSE)
          </button>
          <button
            className={`btn ${activeTab === "ais" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => setActiveTab("ais")}
          >
            🚢 AIS & PyAIS Ingest
          </button>
          <button
            className={`btn ${activeTab === "status" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => setActiveTab("status")}
          >
            ⚡ API Status
          </button>
        </div>

        <div className="modal-body" style={{ padding: "16px", maxHeight: "65vh", overflowY: "auto" }}>
          {/* TAB 1: MARINE WEATHER & OCEAN CURRENTS */}
          {activeTab === "marine" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                  Real-time surface ocean currents & NOAA wave forecasts powering the Lagrangian drift engine.
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  onClick={() => fetchMarineConditions(marineLat, marineLon)}
                  disabled={marineLoading}
                >
                  {marineLoading ? "Fetching..." : "Refresh Conditions"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b" }}>Latitude</label>
                  <input
                    type="number"
                    step="0.01"
                    value={marineLat}
                    onChange={(e) => setMarineLat(parseFloat(e.target.value))}
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "6px 8px", borderRadius: "4px", fontSize: "12px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b" }}>Longitude</label>
                  <input
                    type="number"
                    step="0.01"
                    value={marineLon}
                    onChange={(e) => setMarineLon(parseFloat(e.target.value))}
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "6px 8px", borderRadius: "4px", fontSize: "12px" }}
                  />
                </div>
              </div>

              {marineData && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#38bdf8", marginBottom: "8px" }}>
                    Source: {marineData.source}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", textAlign: "center" }}>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Wave Height</div>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#38bdf8" }}>
                        {marineData.current_conditions?.wave_height_m} m
                      </div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Wave Direction</div>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#f8fafc" }}>
                        {marineData.current_conditions?.wave_direction_deg}°
                      </div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Current Velocity</div>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#4ade80" }}>
                        {marineData.current_conditions?.ocean_current_velocity_knots} kn
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        ({marineData.current_conditions?.ocean_current_velocity_ms} m/s)
                      </div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Current Drift Dir</div>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fbbf24" }}>
                        {marineData.current_conditions?.ocean_current_direction_deg}°
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
                    <label style={{ fontSize: "11px", color: "#64748b" }}>AOI Bounding Box [minLon, minLat, maxLon, maxLat]</label>
                    <input
                      type="text"
                      value={bboxStr}
                      onChange={(e) => setBboxStr(e.target.value)}
                      placeholder="72.0, 18.5, 73.5, 19.5"
                      style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "7px 10px", borderRadius: "4px", fontSize: "12px" }}
                    />
                  </div>
                  <div style={{ width: "120px" }}>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Product</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "7px 8px", borderRadius: "4px", fontSize: "12px" }}
                    >
                      <option value="GRD">GRD (Level-1)</option>
                      <option value="SLC">SLC (Level-1)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: "34px", padding: "0 16px" }} disabled={sarLoading}>
                    {sarLoading ? "Searching..." : "Search CDSE"}
                  </button>
                </div>
              </form>

              {sarResults && (
                <div>
                  <div style={{ fontSize: "12px", color: "#38bdf8", marginBottom: "8px" }}>
                    {sarResults.source} — Found {sarResults.scenes?.length || 0} Scene(s)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {sarResults.scenes?.map((scene, idx) => (
                      <div key={idx} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#f8fafc" }}>
                            {scene.name || scene.id}
                          </span>
                          <span className="badge medium" style={{ fontSize: "10px" }}>
                            {scene.platform} | {scene.polarization?.join("/")}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                          Acquisition: {scene.datetime} | Orbit: {scene.orbit_direction || "DESCENDING"}
                        </div>
                        {scene.download_url && (
                          <div style={{ marginTop: "6px" }}>
                            <a
                              href={scene.download_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}
                            >
                              🔗 Access Sentinel-1 Product Link →
                            </a>
                          </div>
                        )}
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
              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
                Test real-time AIVDM/NMEA sentence parsing via <code>pyais</code> and upsert into the vessel tracking table.
              </div>
              <form onSubmit={handleDecodeNmea} style={{ marginBottom: "14px" }}>
                <textarea
                  rows={3}
                  value={nmeaInput}
                  onChange={(e) => setNmeaInput(e.target.value)}
                  placeholder="!AIVDM,1,1,,B,15N400001?0v;4bEP00000000000,0*12"
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#fff", padding: "8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="submit" className="btn btn-primary" disabled={nmeaLoading}>
                    {nmeaLoading ? "Decoding..." : "Decode Sentence with PyAIS"}
                  </button>
                </div>
              </form>

              {nmeaResult && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: "bold", marginBottom: "6px" }}>
                    Decoded {nmeaResult.decoded_count} Vessel Position Report(s):
                  </div>
                  {nmeaResult.vessels?.map((v, i) => (
                    <div key={i} style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "4px", fontSize: "11px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      <div><b>MMSI:</b> {v.mmsi}</div>
                      <div><b>Lat/Lon:</b> {v.lat}, {v.lon}</div>
                      <div><b>Speed:</b> {v.speed_knots} kn</div>
                      <div><b>Course:</b> {v.course_deg}°</div>
                      <div><b>Type:</b> {v.vessel_type}</div>
                      <div><b>Status:</b> Live Ingested</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SYSTEM API STATUS */}
          {activeTab === "status" && (
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
                Connected external APIs and data providers configured for the surveillance platform:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {statusData?.services?.map((svc, idx) => (
                  <div key={idx} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "#f8fafc" }}>
                        {svc.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Provider: {svc.provider} ({svc.api_type})
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                        {svc.capabilities?.join(" • ")}
                      </div>
                    </div>
                    <span className="badge low" style={{ background: "#064e3b", color: "#6ee7b7", fontSize: "11px" }}>
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
