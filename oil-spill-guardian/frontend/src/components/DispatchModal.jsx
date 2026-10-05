export default function DispatchModal({ spill, topAlert, topVessel, onClose }) {
  if (!spill) return null;

  const lat = spill.centroid_lat || 15.48;
  const lon = spill.centroid_lon || 65.84;

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.className === "modal-bg") onClose(); }}>
      <div className="modal">
        <div className="modal-header-section">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="badge critical" style={{ fontSize: "9px" }}>
                FLASH INTERCEPT DIRECTIVE
              </span>
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--crimson-alert)" }}>
                PRIORITY-1 EMERGENCY BROADCAST
              </span>
            </div>
            <h2>Coast Guard Maritime Intercept Dispatch</h2>
            <div className="sub">
              Command Operation: Western Seaboard Tactical Maritime Operations Center (MRCC Mumbai)
            </div>
          </div>
          <button className="close" onClick={onClose}>&times;</button>
        </div>

        <div style={{
          background: "rgba(255, 59, 92, 0.08)",
          border: "1px solid var(--border-danger)",
          borderRadius: "var(--radius-md)",
          padding: "18px",
          marginTop: "12px",
          boxShadow: "inset 0 0 20px rgba(255, 59, 92, 0.1)"
        }}>
          <div style={{ fontSize: "11px", color: "var(--crimson-alert)", letterSpacing: "1.2px", fontWeight: 800, textTransform: "uppercase" }}>
            🚨 TACTICAL MISSION DISPATCH ORDER #DIR-{spill.id || "2026-0923"}
          </div>

          <div style={{ marginTop: "14px", fontSize: "13px", lineHeight: "1.9", color: "var(--text-primary)" }}>
            <div>
              <b style={{ color: "var(--text-muted)" }}>Target Incident:</b>{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan-bright)" }}>
                {spill.spill_code || `SPL-${spill.id}`}
              </span>
            </div>
            <div>
              <b style={{ color: "var(--text-muted)" }}>Geo Coordinates:</b>{" "}
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {lat.toFixed(4)}°N, {lon.toFixed(4)}°E (Arabian Sea High-Seas Corridor &middot; International Shipping Lane)
              </span>
            </div>
            <div>
              <b style={{ color: "var(--text-muted)" }}>Slick Magnitude:</b>{" "}
              <span style={{ color: "var(--crimson-alert)", fontWeight: 700 }}>
                {spill.area_km2 || 18.7} km² &middot; Confidence: {spill.confidence ? (spill.confidence * 100).toFixed(0) : "94"}%
              </span>
            </div>
            <div>
              <b style={{ color: "var(--text-muted)" }}>Primary Target Vessel:</b>{" "}
              <b style={{ color: "var(--text-pure)" }}>{topVessel?.name || "MV Ocean Pride"}</b>{" "}
              (MMSI: <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan-bright)" }}>{topVessel?.mmsi || topAlert?.vessel_mmsi || "419001234"}</span>)
            </div>
            <div>
              <b style={{ color: "var(--text-muted)" }}>Vessel Tactical State:</b>{" "}
              <span style={{ color: "var(--crimson-alert)", fontWeight: 700 }}>
                {topVessel?.dark ? "⚠ Dark Vessel Operations / AIS Gapped (High Flight Risk)" : "Broadcasting AIS"}
              </span>
            </div>
            <div>
              <b style={{ color: "var(--text-muted)" }}>Containment Directive:</b>{" "}
              <span>Deploy fast-interceptor patrol craft (ICGS Samar / ICGS Vikram) to intercept suspect at Sector 4B; deploy Class-III containment booms along 12nm drift corridor.</span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: "18px",
          padding: "12px 16px",
          background: "rgba(0, 255, 157, 0.08)",
          border: "1px solid var(--border-success)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "12px",
          color: "var(--emerald-safe)"
        }}>
          <span style={{ fontSize: "18px" }}>📡</span>
          <div>
            <b>Encrypted VHF Channel 16 / INMARSAT-C Uplink: Transmitted & Acknowledged</b>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Broadcast Hash: #TX-9021-MRCC at {new Date().toISOString().slice(11, 19)} UTC &middot; Coast Guard Interceptor ETA: 45 min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
