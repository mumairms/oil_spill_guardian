export default function VesselCorrelationPanel({
  activeSpill,
  alerts = [],
  vessels = [],
  onGenerateReport,
  onDispatchAlert,
}) {
  const spillCode = activeSpill?.spill_code || (activeSpill ? `SPL-${activeSpill.id}` : "SPL-2026-0923-001");

  return (
    <div className="panel right">
      <h3>Vessel Correlation</h3>
      <div style={{ fontSize: "12px", color: "#6b8fb5", marginBottom: "12px" }}>
        Candidates for <b style={{ color: "#e8eef7" }}>{spillCode}</b> &middot; {alerts.length} vessels ranked
      </div>

      <div className="vessel-list-container">
        {alerts.map((alert, i) => {
          const vessel = vessels.find((v) => v.mmsi === alert.vessel_mmsi);
          const score = alert.suspicion_score;
          const scoreCls = score > 0.7 ? "" : score > 0.4 ? "low" : "ok";

          return (
            <div key={alert.vessel_mmsi || alert.id} className={`vessel ${i === 0 ? "top" : ""}`}>
              <div className="rank">{i + 1}</div>
              <div className="info">
                <div className="name">
                  <span>{vessel?.name || `Vessel ${alert.vessel_mmsi}`}</span>
                  {vessel?.dark && <span className="dark-tag">⚠</span>}
                </div>
                <div className="meta">
                  {vessel?.vessel_type || "Tanker"} &middot; {alert.distance_km ?? 3.4} km &middot; {alert.time_delta_min ?? 22} min
                </div>
                <div className="reason">
                  {alert.reasoning || "AIS track intersects spill centroid"}
                </div>
              </div>
              <div className={`score ${scoreCls}`}>{score.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: "24px" }}>Actions</h3>
      <button className="action-btn-primary" onClick={onGenerateReport}>
        Generate Evidence Report
      </button>
      <button className="action-btn-secondary" onClick={onDispatchAlert}>
        Dispatch Alert to Coast Guard
      </button>
    </div>
  );
}
