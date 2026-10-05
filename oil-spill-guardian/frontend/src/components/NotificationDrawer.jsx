export default function NotificationDrawer({ isOpen, onClose, onSelectSpill }) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      type: "critical",
      title: "Dark Vessel Anomaly Detected",
      desc: "MV Ocean Pride (MMSI 419001234) ceased AIS transmissions for 4h 12m near spill SPL-2026-0923-001.",
      time: "12m ago",
      spillId: "SPL-2026-0923-001",
    },
    {
      id: 2,
      type: "warning",
      title: "New Sentinel-1 SAR Scene Acquired",
      desc: "Scene S1A_IW_GRDH_20260923T1332 processed by U-Net segmenter. Confidence 94%.",
      time: "34m ago",
      spillId: "SPL-2026-0923-001",
    },
    {
      id: 3,
      type: "info",
      title: "MetOcean Current Vector Synced",
      desc: "Open-Meteo Marine API updated surface vectors for Sector 4B.",
      time: "1h ago",
    },
  ];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Operational Incident Notifications</h3>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Real-time radar & AIS anomaly broadcasts
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`drawer-item ${n.type}`}
              onClick={() => {
                if (n.spillId) onSelectSpill(n.spillId);
                onClose();
              }}
            >
              <div className="drawer-item-head">
                <span className="drawer-item-title">{n.title}</span>
                <span className="drawer-item-time">{n.time}</span>
              </div>
              <div className="drawer-item-desc">{n.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
