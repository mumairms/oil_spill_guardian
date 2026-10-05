import React, { useState, useEffect } from "react";

export default function CommandPalette({ isOpen, onClose, onSelectAction, spills = [], vessels = [] }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: "view_command", title: "Go to Live Tactical Map", category: "Navigation", icon: "🗺️" },
    { id: "view_fleet", title: "Go to Vessel Fleet Catalog", category: "Navigation", icon: "🚢" },
    { id: "view_analytics", title: "Go to Incident Analytics", category: "Navigation", icon: "📊" },
    { id: "view_drift", title: "Go to MetOcean Drift Forecast", category: "Navigation", icon: "🌊" },
    { id: "action_evidence", title: "Generate Legal Evidence Dossier", category: "Actions", icon: "📑" },
    { id: "action_dispatch", title: "Dispatch Coast Guard Intercept Order", category: "Actions", icon: "🚨" },
    { id: "action_apis", title: "Configure Live Satellite APIs & Connectors", category: "Settings", icon: "🛰️" },
  ];

  const filteredActions = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSpills = spills.filter((s) =>
    (s.spill_code || `SPL-${s.id}`).toLowerCase().includes(query.toLowerCase())
  );

  const filteredVessels = vessels.filter((v) =>
    v.name?.toLowerCase().includes(query.toLowerCase()) || v.mmsi?.includes(query)
  );

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="palette-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Type a command, vessel name, MMSI, or spill code... (ESC to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="kbd-badge">ESC</span>
        </div>

        <div className="palette-results-list">
          {/* Quick Actions */}
          <div className="palette-group-title">Commands & Shortcuts</div>
          {filteredActions.map((act) => (
            <div
              key={act.id}
              className="palette-item"
              onClick={() => {
                onSelectAction(act.id);
                onClose();
              }}
            >
              <span className="palette-icon">{act.icon}</span>
              <span className="palette-title">{act.title}</span>
              <span className="palette-category">{act.category}</span>
            </div>
          ))}

          {/* Active Spills */}
          {filteredSpills.length > 0 && (
            <>
              <div className="palette-group-title">Detected Oil Spills</div>
              {filteredSpills.map((s) => (
                <div
                  key={s.id}
                  className="palette-item"
                  onClick={() => {
                    onSelectAction(`spill_${s.spill_code || s.id}`);
                    onClose();
                  }}
                >
                  <span className="palette-icon">🚨</span>
                  <span className="palette-title">{s.spill_code || `SPL-${s.id}`} &middot; {s.area_km2} km²</span>
                  <span className="palette-category" style={{ color: "var(--crimson-alert)" }}>
                    {s.severity?.toUpperCase()}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Tracked Vessels */}
          {filteredVessels.length > 0 && (
            <>
              <div className="palette-group-title">Tracked Vessels</div>
              {filteredVessels.slice(0, 5).map((v) => (
                <div
                  key={v.mmsi}
                  className="palette-item"
                  onClick={() => {
                    onSelectAction(`vessel_${v.mmsi}`);
                    onClose();
                  }}
                >
                  <span className="palette-icon">🚢</span>
                  <span className="palette-title">{v.name} (MMSI: {v.mmsi})</span>
                  <span className="palette-category">
                    {v.dark ? "⚠ DARK VESSEL" : `${v.speed_knots} kn`}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
