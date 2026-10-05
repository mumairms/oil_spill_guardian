export default function VesselCorrelationPanel({
  activeSpill,
  alerts = [],
  vessels = [],
  onGenerateReport,
  onDispatchAlert,
}) {
  const spillCode = activeSpill?.spill_code || (activeSpill ? `SPL-${activeSpill.id}` : "SPL-2026-0923-001");
  const topAlert = alerts[0];
  const topVessel = vessels.find((v) => v.mmsi === topAlert?.vessel_mmsi);

  const factors = topAlert?.factors || {
    f1_distance: 0.94,
    f2_time: 0.88,
    f3_type: 1.0,
    f4_speed: 0.85,
    f5_drift: 0.92,
    f6_gap: 0.67,
  };

  return (
    <div className="panel right">
      {/* Panel Header */}
      <div className="panel-header-section">
        <div className="panel-title">
          <span className="panel-title-icon">🎯</span> Vessel Attribution
        </div>
        <span className="badge critical" style={{ fontSize: "9px" }}>
          SIH261430 ENGINE
        </span>
      </div>

      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
        Target Spill: <b style={{ color: "var(--text-pure)", fontFamily: "var(--font-mono)" }}>{spillCode}</b> &middot; {alerts.length} candidate vessels evaluated
      </div>

      {/* Primary Suspect Card */}
      {topAlert && (
        <div className="suspect-hero-card">
          <div className="suspect-hero-header">
            <div className="suspect-name-block">
              <span style={{ fontSize: "9.5px", color: "var(--crimson-alert)", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
                Primary Suspect (Top-1 Match)
              </span>
              <div className="suspect-vessel-title">
                {topVessel?.name || `MMSI ${topAlert.vessel_mmsi}`}
                {topVessel?.dark && <span className="dark-tag">DARK</span>}
              </div>
              <span className="suspect-mmsi-label">
                MMSI: {topVessel?.mmsi || topAlert.vessel_mmsi} &middot; Flag: {topVessel?.flag || "IN"}
              </span>
            </div>

            <div className="suspicion-gauge">
              <span className="suspicion-gauge-val">
                {((topAlert.suspicion_score || 0.91) * 100).toFixed(0)}%
              </span>
              <span className="suspicion-gauge-sub">ATTRIBUTION</span>
            </div>
          </div>

          {/* Multi-Factor Formula Breakdown */}
          <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-danger)", paddingTop: "10px" }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>
              Multi-Factor Scoring Matrix (Section 6.2)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", textAlign: "center", fontSize: "10.5px", fontFamily: "var(--font-mono)" }}>
              <div style={{ background: "rgba(16, 26, 43, 0.8)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>f1 Dist (30%)</div>
                <div style={{ color: "var(--cyan-bright)", fontWeight: 700 }}>{(factors.f1_distance * 100).toFixed(0)}%</div>
              </div>
              <div style={{ background: "rgba(16, 26, 43, 0.8)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>f2 Time (25%)</div>
                <div style={{ color: "var(--cyan-bright)", fontWeight: 700 }}>{(factors.f2_time * 100).toFixed(0)}%</div>
              </div>
              <div style={{ background: "rgba(16, 26, 43, 0.8)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>f3 Type (15%)</div>
                <div style={{ color: "var(--emerald-safe)", fontWeight: 700 }}>{(factors.f3_type * 100).toFixed(0)}%</div>
              </div>
              <div style={{ background: "rgba(16, 26, 43, 0.8)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>f4 Speed (10%)</div>
                <div style={{ color: "var(--amber-warn)", fontWeight: 700 }}>{(factors.f4_speed * 100).toFixed(0)}%</div>
              </div>
              <div style={{ background: "rgba(16, 26, 43, 0.8)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>f5 Drift (10%)</div>
                <div style={{ color: "var(--cyan-bright)", fontWeight: 700 }}>{(factors.f5_drift * 100).toFixed(0)}%</div>
              </div>
              <div style={{ background: "rgba(16, 26, 43, 0.8)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>f6 Gap (10%)</div>
                <div style={{ color: "var(--crimson-alert)", fontWeight: 700 }}>{(factors.f6_gap * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          <div className="attribution-checklist" style={{ marginTop: "10px" }}>
            <div className="check-item alert">
              <span>⚠</span>
              <span>{topAlert.reasoning || "AIS gap detected; track passes through spill centroid with slowdown"}</span>
            </div>
            <div className="check-item ok">
              <span>✓</span>
              <span>Geodesic Distance: {topAlert.distance_km ?? 3.4} km &middot; Time Delta: {topAlert.time_delta_min ?? 22} min</span>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Vessels Ranked */}
      <div className="panel-header-section" style={{ marginTop: "4px" }}>
        <div className="panel-title" style={{ fontSize: "10.5px" }}>
          Ranked Suspects (Evaluation Top-5)
        </div>
      </div>

      <div className="vessel-list-container">
        {alerts.map((alert, i) => {
          const vessel = vessels.find((v) => v.mmsi === alert.vessel_mmsi);
          const score = alert.suspicion_score || 0;
          const scoreCls = score > 0.7 ? "" : score > 0.4 ? "low" : "ok";

          return (
            <div key={alert.vessel_mmsi || alert.id || i} className={`vessel ${i === 0 ? "top" : ""}`}>
              <div className="rank">{i + 1}</div>
              <div className="info">
                <div className="name">
                  <span>{vessel?.name || `Vessel ${alert.vessel_mmsi}`}</span>
                  {vessel?.dark && <span className="dark-tag">DARK</span>}
                </div>
                <div className="meta">
                  {vessel?.vessel_type || "Tanker"} &middot; {alert.distance_km ?? 3.4} km &middot; {alert.time_delta_min ?? 22} min
                </div>
                <div className="reason">
                  {alert.reasoning || "AIS track intersects spill centroid"}
                </div>
              </div>
              <div className={`score ${scoreCls}`}>{(score * 100).toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

      {/* Operational Action Buttons */}
      <div style={{ marginTop: "auto", paddingTop: "10px" }}>
        <button className="action-btn-primary" onClick={onGenerateReport}>
          <span>📑</span> Generate Legal Evidence Dossier
        </button>
        <button className="action-btn-secondary" onClick={onDispatchAlert}>
          <span>🚨</span> Dispatch Flash Intercept Directive
        </button>
      </div>
    </div>
  );
}
