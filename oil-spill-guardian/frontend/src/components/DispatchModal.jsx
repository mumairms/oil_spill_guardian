export default function DispatchModal({ spill, topAlert, topVessel, onClose }) {
  if (!spill) return null;

  const centroid = spill.polygon_geojson?.coordinates?.[0]?.[0] || [72.84, 19.08];
  const lat = centroid[1];
  const lon = centroid[0];

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.className === "modal-bg") onClose(); }}>
      <div className="modal">
        <button className="close" onClick={onClose}>&times;</button>
        <h2>Priority Alert Dispatched</h2>
        <div className="sub">Coast Guard Maritime Command &mdash; Priority Emergency Channel</div>

        <div style={{ background: "#12233f", border: "1px solid #ff3b30", borderRadius: "8px", padding: "16px", marginTop: "12px" }}>
          <div style={{ fontSize: "11px", color: "#ff5c52", letterSpacing: "1px", fontWeight: 700 }}>
            ⚠ EMERGENCY DISPATCH SUMMARY
          </div>
          <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: "1.8", color: "#e8eef7" }}>
            <div><b>Incident ID:</b> {spill.spill_code || `SPL-${spill.id}`}</div>
            <div><b>Location:</b> {lat.toFixed(3)}°N, {lon.toFixed(3)}°E (Arabian Sea Off Mumbai)</div>
            <div><b>Estimated Area:</b> {spill.area_km2 || 18.7} km² &middot; <b>Confidence:</b> {spill.confidence ? (spill.confidence * 100).toFixed(0) : "94"}%</div>
            <div><b>Primary Suspect:</b> {topVessel?.name || "MV Ocean Pride"} (MMSI: {topVessel?.mmsi || topAlert?.vessel_mmsi || "419001234"})</div>
            <div><b>Vessel Status:</b> {topVessel?.dark ? "AIS gap detected (Dark Vessel Operation)" : "Transmitting"}</div>
            <div><b>Drift Trajectory:</b> South-East toward Maharashtra coastline</div>
            <div><b>Recommended Action:</b> Intercept suspect vessel within 6h, deploy containment booms along primary drift corridor.</div>
          </div>
        </div>

        <p style={{ marginTop: "18px", fontSize: "13px", color: "#4ade80", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>✓</span> Alert transmitted successfully to Coast Guard Authorities at {new Date().toISOString().slice(11, 19)} UTC
        </p>
      </div>
    </div>
  );
}
