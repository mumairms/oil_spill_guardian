export default function AlertPanel({ spills, alerts, onCorrelate }) {
  return (
    <div className="panel">
      <h2>Active Spills</h2>
      {spills.length === 0 && <p className="muted">No spills detected.</p>}
      {spills.map((spill) => (
        <div key={spill.id} className="card">
          <div className="card-title">
            Spill #{spill.id} — {spill.status}
          </div>
          <div className="card-body">
            Detected {new Date(spill.detected_at).toLocaleString()}
            <br />
            {spill.area_km2} km² &middot; {(spill.confidence * 100).toFixed(0)}% confidence
          </div>
          <button onClick={() => onCorrelate(spill.id)}>
            Find probable responsible vessel
          </button>
        </div>
      ))}

      <h2>Alerts</h2>
      {alerts.length === 0 && <p className="muted">No alerts yet — run correlation on a spill.</p>}
      {alerts.map((alert) => (
        <div key={alert.id} className="card alert">
          <div className="card-title">
            Vessel {alert.vessel_mmsi} — suspicion {(alert.suspicion_score * 100).toFixed(0)}%
          </div>
          <div className="card-body">{alert.reasoning}</div>
        </div>
      ))}
    </div>
  );
}
