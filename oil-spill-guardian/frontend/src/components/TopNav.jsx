import { useState } from "react";

export default function TopNav({
  activeView,
  onSelectView,
  clock,
  darkCount,
  spillsCount,
  onOpenApis,
  onOpenEvidence,
  onOpenDispatch,
  onOpenNotifications,
  onOpenCommandPalette,
  unreadCount = 3,
  showLeftPanel,
  showRightPanel,
  onToggleLeftPanel,
  onToggleRightPanel,
}) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="clean-topbar">
      {/* Left: Breadcrumbs & Search Bar */}
      <div className="topbar-left-section">
        <div className="breadcrumbs">
          <span className="crumb-root">Aegis Maritime</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-active">
            {activeView === "command" && "Tactical Command Map"}
            {activeView === "fleet" && "Vessel Fleet Registry"}
            {activeView === "drift" && "MetOcean Drift Simulator"}
            {activeView === "analytics" && "Operational Intelligence"}
          </span>
        </div>

        {/* Global Search Command Trigger */}
        <button className="command-search-btn" onClick={onOpenCommandPalette}>
          <span className="search-icon">🔍</span>
          <span className="search-text">Search vessels, spills, commands...</span>
          <span className="search-shortcut">⌘K</span>
        </button>
      </div>

      {/* Right: Actions, Panels Toggle, Clock & User */}
      <div className="topbar-right-section">
        {/* Map Panel Layout Toggles (only in command view) */}
        {activeView === "command" && (
          <div className="panel-toggles-group">
            <button
              className={`toggle-pill-btn ${showLeftPanel ? "active" : ""}`}
              onClick={onToggleLeftPanel}
              title="Toggle Spill Recon Panel"
            >
              <span>🛰️</span> Spills Panel
            </button>
            <button
              className={`toggle-pill-btn ${showRightPanel ? "active" : ""}`}
              onClick={onToggleRightPanel}
              title="Toggle Suspect Correlation Panel"
            >
              <span>🎯</span> Attribution Panel
            </button>
          </div>
        )}

        {/* Quick Operations Menu Dropdown */}
        <div className="dropdown-container">
          <button
            className="action-menu-btn"
            onClick={() => setShowQuickMenu(!showQuickMenu)}
          >
            <span>⚡ Quick Actions</span>
            <span style={{ fontSize: "10px" }}>▼</span>
          </button>

          {showQuickMenu && (
            <div className="menu-dropdown-card" onClick={() => setShowQuickMenu(false)}>
              <div className="dropdown-item" onClick={onOpenEvidence}>
                <span>📑</span> Generate Legal Evidence Dossier
              </div>
              <div className="dropdown-item" onClick={onOpenDispatch}>
                <span>🚨</span> Dispatch Coast Guard Intercept
              </div>
              <div className="dropdown-item" onClick={onOpenApis}>
                <span>🛰️</span> Query Sentinel-1 CDSE
              </div>
              <div className="dropdown-item" onClick={() => onSelectView("drift")}>
                <span>🌊</span> Launch 72h Drift Simulation
              </div>
            </div>
          )}
        </div>

        {/* Live UTC Clock */}
        <div className="topbar-clock-card">
          <span className="clock-label">UTC</span>
          <span className="clock-time">{clock || "--:--:--"}</span>
        </div>

        {/* Notifications Icon Button */}
        <button
          className="topbar-icon-btn"
          title="Incident Alerts"
          onClick={onOpenNotifications}
        >
          <span>🔔</span>
          {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
        </button>

        {/* User Profile */}
        <div className="dropdown-container">
          <div className="user-pill" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="avatar-circle">CR</div>
            <div className="user-info-text">
              <span className="name">Cmdr. Rathi</span>
              <span className="role">MRCC Mumbai</span>
            </div>
          </div>

          {showProfileMenu && (
            <div className="menu-dropdown-card" onClick={() => setShowProfileMenu(false)}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ fontWeight: 600, color: "#fff" }}>Commander V. Rathi</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Duty Officer &middot; Sector 4B</div>
              </div>
              <div className="dropdown-item" onClick={onOpenApis}>
                <span>⚙️</span> Satellite & AIS API Settings
              </div>
              <div className="dropdown-item" onClick={() => alert("Station: Western Seaboard Tactical Ops")}>
                <span>📍</span> Station Deployment
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
