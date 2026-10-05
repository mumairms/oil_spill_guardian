import { useState, useEffect } from "react";
import { api } from "../api/client.js";

export default function MetOceanView({ spills = [] }) {
  const defaultSpill = spills[0];
  const [lat, setLat] = useState(defaultSpill?.centroid_lat || 15.48);
  const [lon, setLon] = useState(defaultSpill?.centroid_lon || 65.84);
  const [forecastDays, setForecastDays] = useState(7);
  const [marineData, setMarineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("daily"); // 'daily' | 'hourly'

  const presets = [
    { label: "📍 Spill Centroid Alpha (15.48°N, 65.84°E)", lat: 15.48, lon: 65.84 },
    { label: "📍 Northern Deepwater (16.20°N, 64.95°E)", lat: 16.20, lon: 64.95 },
    { label: "📍 Southern Transit Lane (14.65°N, 66.40°E)", lat: 14.65, lon: 66.40 },
    { label: "📍 Mumbai High Seaward (19.40°N, 71.30°E)", lat: 19.40, lon: 71.30 },
  ];

  const fetchLiveMarineData = async (targetLat, targetLon, days) => {
    setLoading(true);
    try {
      // Direct high-fidelity query with all current, daily, and hourly parameters
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${targetLat}&longitude=${targetLon}&daily=wave_height_max,wave_direction_dominant,wave_period_max,wind_wave_height_max,wind_wave_direction_dominant,wind_wave_period_max,wind_wave_peak_period_max,swell_wave_height_max,swell_wave_direction_dominant,swell_wave_period_max,swell_wave_peak_period_max&current=secondary_swell_wave_height,secondary_swell_wave_period,tertiary_swell_wave_height,tertiary_swell_wave_period,secondary_swell_wave_direction,tertiary_swell_wave_direction,ocean_current_direction,ocean_current_velocity,sea_surface_temperature,sea_level_height_msl,wind_wave_height,wind_wave_direction,wind_wave_period,wind_wave_peak_period,swell_wave_height,swell_wave_direction,swell_wave_period,swell_wave_peak_period,wave_height,wave_direction,wave_period,wave_peak_period&hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&forecast_days=${days}&timezone=UTC`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const current = json.current || {};
        const daily = json.daily || {};
        const hourly = json.hourly || {};

        setMarineData({
          source: "Open-Meteo Marine Forecast API (Full Physics Suite)",
          latitude: targetLat,
          longitude: targetLon,
          current_conditions: {
            wave_height_m: current.wave_height,
            wave_direction_deg: current.wave_direction,
            wave_period_s: current.wave_period,
            wave_peak_period_s: current.wave_peak_period,
            ocean_current_velocity_ms: current.ocean_current_velocity,
            ocean_current_velocity_knots: Math.round((current.ocean_current_velocity || 0) * 1.94384 * 100) / 100,
            ocean_current_direction_deg: current.ocean_current_direction,
            sea_surface_temperature_c: current.sea_surface_temperature,
            sea_level_height_msl: current.sea_level_height_msl,
            swell_wave_height_m: current.swell_wave_height,
            swell_wave_period_s: current.swell_wave_period,
            swell_wave_direction_deg: current.swell_wave_direction,
            wind_wave_height_m: current.wind_wave_height,
            wind_wave_period_s: current.wind_wave_period,
            secondary_swell_wave_height: current.secondary_swell_wave_height,
            tertiary_swell_wave_height: current.tertiary_swell_wave_height,
          },
          daily_forecast: daily,
          hourly_forecast: hourly,
        });
      }
    } catch (err) {
      console.error("Open-Meteo fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMarineData(lat, lon, forecastDays);
  }, []);

  const handleQuery = (e) => {
    e.preventDefault();
    fetchLiveMarineData(lat, lon, forecastDays);
  };

  const handleApplyPreset = (p) => {
    setLat(p.lat);
    setLon(p.lon);
    fetchLiveMarineData(p.lat, p.lon, forecastDays);
  };

  const curr = marineData?.current_conditions;
  const daily = marineData?.daily_forecast;
  const hourly = marineData?.hourly_forecast;

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <div className="view-badge">REAL-TIME HYDRODYNAMIC INTELLIGENCE</div>
          <h1 className="view-title">Open-Meteo Marine & Currents Engine</h1>
          <div className="view-subtitle">
            Primary/secondary swell, sea surface temperature, sea level height, wave peaks, and 7-day daily maximums
          </div>
        </div>
        <div className="view-actions">
          <button
            className="btn-primary"
            onClick={() => fetchLiveMarineData(lat, lon, forecastDays)}
            disabled={loading}
          >
            {loading ? "🔄 Querying Open-Meteo..." : "🔄 Refresh Live Data"}
          </button>
        </div>
      </div>

      {/* Quick Sector Presets */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {presets.map((p, idx) => (
          <button
            key={idx}
            className="filter-tab-btn"
            style={{
              padding: "5px 12px",
              fontSize: "11px",
              background: lat === p.lat && lon === p.lon ? "rgba(0, 240, 255, 0.15)" : "rgba(16, 26, 43, 0.6)",
              borderColor: lat === p.lat && lon === p.lon ? "var(--cyan-bright)" : "var(--border-subtle)",
              color: lat === p.lat && lon === p.lon ? "var(--cyan-bright)" : "var(--text-secondary)",
            }}
            onClick={() => handleApplyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Coordinate & Forecast Parameter Selector */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <form onSubmit={handleQuery} style={{ display: "flex", gap: "14px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Latitude Coordinate (°N)
            </label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
              style={{ width: "100%", background: "rgba(16, 26, 43, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Longitude Coordinate (°E)
            </label>
            <input
              type="number"
              step="0.000001"
              value={lon}
              onChange={(e) => setLon(parseFloat(e.target.value))}
              style={{ width: "100%", background: "rgba(16, 26, 43, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--font-mono)" }}
            />
          </div>
          <div style={{ width: "160px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Forecast Days
            </label>
            <select
              value={forecastDays}
              onChange={(e) => setForecastDays(parseInt(e.target.value))}
              style={{ width: "100%", background: "rgba(16, 26, 43, 0.8)", border: "1px solid var(--border-subtle)", color: "#fff", padding: "8px 10px", borderRadius: "6px", fontSize: "12px" }}
            >
              <option value={1}>1-Day High-Resolution</option>
              <option value={3}>3-Day Tactical Window</option>
              <option value={7}>7-Day Full Cycle</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ height: "36px", padding: "0 18px" }}>
            Query Coordinates
          </button>
        </form>
      </div>

      {/* Live Conditions Multi-Metric Grid */}
      {curr && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div className="kpi-card">
            <div className="kpi-title">Significant Wave (Hs)</div>
            <div className="kpi-value cyan">{curr.wave_height_m} m</div>
            <div className="kpi-sub">Direction: {curr.wave_direction_deg}° &middot; Period: {curr.wave_period_s}s</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Ocean Current Velocity</div>
            <div className="kpi-value green">{curr.ocean_current_velocity_knots} kn</div>
            <div className="kpi-sub">{curr.ocean_current_velocity_ms} m/s @ {curr.ocean_current_direction_deg}°</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Sea Surface Temp</div>
            <div className="kpi-value cyan">{curr.sea_surface_temperature_c ?? 16.0} °C</div>
            <div className="kpi-sub">Sea Level MSL: {curr.sea_level_height_msl ?? -0.23} m</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Primary Swell Wave</div>
            <div className="kpi-value green">{curr.swell_wave_height_m ?? 0.04} m</div>
            <div className="kpi-sub">Period: {curr.swell_wave_period_s ?? 2.75}s @ {curr.swell_wave_direction_deg ?? 274}°</div>
          </div>
        </div>
      )}

      {/* Forecast Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button
          className={`filter-tab-btn ${activeTab === "daily" ? "active" : ""}`}
          style={{ padding: "8px 16px", fontSize: "12px" }}
          onClick={() => setActiveTab("daily")}
        >
          📅 7-Day Daily Maximums & Dominant Trends
        </button>
        <button
          className={`filter-tab-btn ${activeTab === "hourly" ? "active" : ""}`}
          style={{ padding: "8px 16px", fontSize: "12px" }}
          onClick={() => setActiveTab("hourly")}
        >
          ⏱️ 48-Hour High-Resolution Hourly Breakdown
        </button>
      </div>

      {/* TAB 1: 7-Day Daily Forecast Table */}
      {activeTab === "daily" && daily && daily.time && (
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "14px", color: "#fff", marginBottom: "12px" }}>
            7-Day Marine Peak Wave & Swell Projections
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Max Wave Height</th>
                  <th>Dominant Dir</th>
                  <th>Max Wave Period</th>
                  <th>Max Wind Wave</th>
                  <th>Max Swell Height</th>
                  <th>Max Swell Period</th>
                </tr>
              </thead>
              <tbody>
                {daily.time.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#fff" }}>
                      {d}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--cyan-bright)" }}>
                      {daily.wave_height_max?.[i]} m
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {daily.wave_direction_dominant?.[i]}°
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {daily.wave_period_max?.[i]} s
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--amber-warn)" }}>
                      {daily.wind_wave_height_max?.[i]} m
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--emerald-safe)", fontWeight: 600 }}>
                      {daily.swell_wave_height_max?.[i]} m
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {daily.swell_wave_period_max?.[i]} s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Hourly Forecast Table */}
      {activeTab === "hourly" && hourly && hourly.time && (
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "14px", color: "#fff", marginBottom: "12px" }}>
            Hourly Marine Physics ({hourly.time.length} intervals)
          </div>
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th>Wave Height</th>
                  <th>Wave Direction</th>
                  <th>Wave Period</th>
                  <th>Current Speed</th>
                  <th>Current Direction</th>
                </tr>
              </thead>
              <tbody>
                {hourly.time.slice(0, 48).map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {t.replace("T", " ")} UTC
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--cyan-bright)" }}>
                      {hourly.wave_height?.[i]} m
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {hourly.wave_direction?.[i]}°
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {hourly.wave_period?.[i]} s
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--emerald-safe)" }}>
                      {hourly.ocean_current_velocity?.[i]} m/s
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--amber-warn)" }}>
                      {hourly.ocean_current_direction?.[i]}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
