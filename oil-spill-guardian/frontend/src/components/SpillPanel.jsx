import { useState } from "react";

export default function SpillPanel({
  spills = [],
  activeSpillId,
  onSelectSpill,
  vesselCount = 1284,
  darkCount = 3,
  scenesCount = 147,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'critical' | 'high'

  const formatTime = (isoString) => {
    if (!isoString) return "2026-09-23 13:32 UTC";
    try {
      const d = new Date(isoString);
      return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
    } catch {
      return isoString;
    }
  };

  const filteredSpills = spills.filter((s) => {
    const severity = s.severity || (s.area_km2 > 15 ? "critical" : s.area_km2 > 8 ? "high" : "medium");
    if (filter === "critical") return severity === "critical";
    if (filter === "high") return severity === "high" || severity === "critical";
    return true;
  });

  return (
    <div className="panel left">
      {/* Panel Header & Filter Tabs */}
      <div className="panel-header-section">
        <div className="panel-title">
          <span className="panel-title-icon">🛰️</span> Spill Reconnaissance
        </div>
        <span className="badge medium" style={{ fontSize: "10px" }}>
          {spills.length} Incidents
        </span>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({spills.length})
        </button>
        <button
          className={`filter-tab-btn ${filter === "critical" ? "active" : ""}`}
          onClick={() => setFilter("critical")}
        >
          Critical
        </button>
        <button
          className={`filter-tab-btn ${filter === "high" ? "active" : ""}`}
          onClick={() => setFilter("high")}
        >
          High Risk
        </button>
      </div>

      {/* Incident List */}
      <div className="spill-list-container">
        {filteredSpills.map((s) => {
          const code = s.spill_code || `SPL-${s.id}`;
          const isActive = (s.spill_code || s.id) === activeSpillId;
          const severity = s.severity || (s.area_km2 > 15 ? "critical" : s.area_km2 > 8 ? "high" : "medium");
          const confidence = s.confidence ? (s.confidence * 100).toFixed(0) : "94";

          return (
            <div
              key={s.id}
              className={`card spill-card ${severity} ${isActive ? "active" : ""}`}
              onClick={() => onSelectSpill(s.spill_code || s.id)}
            >
              <div className="spill-card-head">
                <div className="spill-id">
                  {isActive && <div className="pulse-ring"></div>}
                  <span>{code}</span>
                </div>
                <span className={`badge ${severity}`}>
                  {severity === "critical" ? "● CRITICAL" : severity === "high" ? "● HIGH RISK" : "● MEDIUM"}
                </span>
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
                🛰️ {s.scene || "Sentinel-1A SAR Scan"}
              </div>

              <div className="spill-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Detected UTC</span>
                  <span className="meta-value">{formatTime(s.detected_at)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Est. Surface Area</span>
                  <span className="meta-value" style={{ color: "var(--cyan-bright)" }}>
                    {s.area_km2 || 18.7} km²
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">ML Confidence</span>
                  <span className="meta-value" style={{ color: "var(--emerald-safe)" }}>
                    {confidence}%
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Shoreline Threat</span>
                  <span className="meta-value" style={{ color: severity === "critical" ? "var(--crimson-alert)" : "var(--amber-warn)" }}>
                    {severity === "critical" ? "Severe (ETA <48h)" : "Moderate"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MetOcean Environmental Snapshot */}
      <div className="panel-header-section" style={{ marginTop: "8px" }}>
        <div className="panel-title">
          <span className="panel-title-icon">🌊</span> MetOcean Telemetry
        </div>
      </div>

      <div className="card" style={{ padding: "12px", background: "rgba(10, 20, 36, 0.7)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11.5px" }}>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase" }}>Surface Wind</div>
            <div style={{ color: "var(--text-pure)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>14.2 kn (WSW)</div>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase" }}>Wave Height (Hs)</div>
            <div style={{ color: "var(--cyan-bright)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>1.4 m &middot; 6.2s</div>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase" }}>Surface Current</div>
            <div style={{ color: "var(--emerald-safe)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>0.62 m/s @ 195°</div>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "10px", textTransform: "uppercase" }}>Sea Temperature</div>
            <div style={{ color: "var(--amber-warn)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>28.4 °C</div>
          </div>
        </div>
      </div>

      {/* Global Telemetry Metrics */}
      <div className="panel-header-section" style={{ marginTop: "8px" }}>
        <div className="panel-title">
          <span className="panel-title-icon">⚡</span> Fleet & Sensor Coverage
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">SAR Scenes (24h)</div>
          <div className="stat-value cyan">{scenesCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AIS Ships Online</div>
          <div className="stat-value">{vesselCount}</div>
        </div>
        <div className="stat-card" style={{ gridColumn: "1 / -1", borderColor: "var(--border-danger)" }}>
          <div className="stat-label" style={{ color: "var(--crimson-alert)" }}>
            ⚠ Dark Transponder Anomaly Alerts
          </div>
          <div className="stat-value red" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{darkCount} Vessels</span>
            <span className="badge critical" style={{ fontSize: "10px" }}>INTERCEPT PRIORITY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
