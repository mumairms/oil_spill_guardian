import React from "react";

export default function SidebarNav({
  activeView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  darkCount = 0,
  spillsCount = 0,
  onOpenApis,
  onOpenEvidence,
  onOpenDispatch,
}) {
  const primaryNav = [
    { id: "command", label: "Live Command Map", icon: "🗺️", badge: spillsCount > 0 ? `${spillsCount}` : null, badgeType: "danger" },
    { id: "fleet", label: "Vessel Fleet Registry", icon: "🚢", badge: darkCount > 0 ? `${darkCount} Dark` : null, badgeType: "warn" },
    { id: "drift", label: "MetOcean Drift Model", icon: "🌊" },
    { id: "analytics", label: "Intelligence Analytics", icon: "📊" },
  ];

  const secondaryNav = [
    { id: "evidence_action", label: "Legal Evidence Dossier", icon: "📑", action: onOpenEvidence },
    { id: "dispatch_action", label: "Coast Guard Dispatch", icon: "🚨", action: onOpenDispatch },
    { id: "connectors_action", label: "Sensors & Live APIs", icon: "🛰️", action: onOpenApis },
  ];

  return (
    <aside className={`clean-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-gem">
            <span className="gem-pulse"></span>
          </div>
          {!collapsed && (
            <div className="brand-text-block">
              <span className="brand-title-main">AEGIS GUARDIAN</span>
              <span className="brand-sub-badge">DEFENSE OS</span>
            </div>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Main Navigation Section */}
      <div className="sidebar-nav-section">
        {!collapsed && <div className="nav-section-title">COMMAND VIEWS</div>}
        <nav className="nav-items-group">
          {primaryNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => onSelectView(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <span className="item-icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="item-label">{item.label}</span>
                    {item.badge && (
                      <span className={`item-badge ${item.badgeType || "default"}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && <div className="nav-section-title" style={{ marginTop: "20px" }}>OPERATIONS & TOOLS</div>}
        <nav className="nav-items-group">
          {secondaryNav.map((item) => (
            <button
              key={item.id}
              className="sidebar-nav-item"
              onClick={item.action}
              title={collapsed ? item.label : undefined}
            >
              <span className="item-icon">{item.icon}</span>
              {!collapsed && <span className="item-label">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer Status */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="footer-status-card">
            <div className="status-row">
              <span className="pulse-indicator"></span>
              <span className="status-label">DEFENSE SENSORS: <b>ONLINE</b></span>
            </div>
            <div className="status-sub">Sentinel-1A/B &middot; High-Freq AIS</div>
          </div>
        ) : (
          <div className="collapsed-status-dot" title="Sensors Online"></div>
        )}
      </div>
    </aside>
  );
}
