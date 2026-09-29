export default function SpillPanel({
  spills = [],
  activeSpillId,
  onSelectSpill,
  vesselCount = 1284,
  darkCount = 3,
  scenesCount = 147,
}) {
  const formatTime = (isoString) => {
    if (!isoString) return "2026-09-23 13:32 UTC";
    try {
      const d = new Date(isoString);
      return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
    } catch {
      return isoString;
    }
  };

  return (
    <div className="panel left">
      <h3>Detected Oil Spills</h3>
      <div className="spill-list-container">
        {spills.map((s) => {
          const code = s.spill_code || `SPL-${s.id}`;
          const isActive = (s.spill_code || s.id) === activeSpillId;
          const severity = s.severity || (s.area_km2 > 15 ? "critical" : s.area_km2 > 8 ? "high" : "medium");

          return (
            <div
              key={s.id}
              className={`card spill-card ${isActive ? "active" : ""}`}
              onClick={() => onSelectSpill(s.spill_code || s.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "13px", fontBold: 600, fontWeight: 600 }}>{code}</div>
                <span className={`badge ${severity}`}>{severity}</span>
              </div>
              <div className="row">
                <span>{formatTime(s.detected_at)}</span>
                <span>{s.area_km2 || 12.4} km²</span>
              </div>
              <div className="row">
                <span>Confidence</span>
                <span style={{ color: "#4ade80", fontWeight: 700 }}>
                  {s.confidence ? (s.confidence * 100).toFixed(0) + "%" : "90%"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: "20px" }}>Platform Stats</h3>
      <div className="card">
        <div className="label">Scenes Processed (24h)</div>
        <div className="value blue">{scenesCount}</div>
      </div>
      <div className="card">
        <div className="label">Active Vessels Tracked</div>
        <div className="value">{vesselCount}</div>
      </div>
      <div className="card">
        <div className="label">Dark / Anomalous Vessels</div>
        <div className="value red">{darkCount}</div>
      </div>
    </div>
  );
}
