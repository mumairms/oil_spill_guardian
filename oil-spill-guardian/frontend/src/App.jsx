import { useEffect, useState, useCallback, useMemo } from "react";
import "./App.css";
import SidebarNav from "./components/SidebarNav.jsx";
import TopNav from "./components/TopNav.jsx";
import MapView from "./components/MapView.jsx";
import SpillPanel from "./components/SpillPanel.jsx";
import VesselCorrelationPanel from "./components/VesselCorrelationPanel.jsx";
import FleetRegistryView from "./components/FleetRegistryView.jsx";
import AnalyticsView from "./components/AnalyticsView.jsx";
import MetOceanView from "./components/MetOceanView.jsx";
import EvidenceModal from "./components/EvidenceModal.jsx";
import DispatchModal from "./components/DispatchModal.jsx";
import ExternalApisModal from "./components/ExternalApisModal.jsx";
import NotificationDrawer from "./components/NotificationDrawer.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import { api } from "./api/client.js";

const DEFAULT_CENTER = [15.48, 65.84];

const FALLBACK_SPILLS = [
  {
    id: 1,
    spill_code: "SPL-2026-0923-001",
    scene: "S1A_IW_GRDH_20260923T1332",
    detected_at: "2026-09-23T13:32:00Z",
    confidence: 0.96,
    area_km2: 24.5,
    severity: "critical",
    centroid_lat: 15.48,
    centroid_lon: 65.84,
    polygon_geojson: {
      type: "Polygon",
      coordinates: [[
        [65.72, 15.48], [65.76, 15.52], [65.83, 15.55], [65.90, 15.54],
        [65.95, 15.50], [65.96, 15.44], [65.92, 15.39], [65.84, 15.37],
        [65.77, 15.39], [65.72, 15.43], [65.72, 15.48],
      ]],
    },
    drift_geojson: [
      [15.48, 65.84], [15.38, 66.02], [15.25, 66.22], [15.10, 66.45], [14.90, 66.70],
    ],
  },
  {
    id: 2,
    spill_code: "SPL-2026-0923-002",
    scene: "S1B_IW_GRDH_20260923T0418",
    detected_at: "2026-09-23T04:18:00Z",
    confidence: 0.86,
    area_km2: 8.4,
    severity: "high",
    centroid_lat: 16.20,
    centroid_lon: 64.95,
    polygon_geojson: {
      type: "Polygon",
      coordinates: [[
        [64.88, 16.20], [64.92, 16.24], [64.97, 16.26], [65.02, 16.23],
        [65.01, 16.18], [64.96, 16.15], [64.90, 16.16], [64.88, 16.20],
      ]],
    },
    drift_geojson: [
      [16.20, 64.95], [16.10, 65.15], [15.95, 65.40], [15.78, 65.65],
    ],
  },
  {
    id: 3,
    spill_code: "SPL-2026-0922-007",
    scene: "S1A_IW_GRDH_20260922T1330",
    detected_at: "2026-09-22T13:30:00Z",
    confidence: 0.91,
    area_km2: 14.1,
    severity: "medium",
    centroid_lat: 14.65,
    centroid_lon: 66.40,
    polygon_geojson: {
      type: "Polygon",
      coordinates: [[
        [66.32, 14.65], [66.36, 14.69], [66.42, 14.71], [66.47, 14.67],
        [66.46, 14.62], [66.40, 14.59], [66.34, 14.60], [66.32, 14.65],
      ]],
    },
    drift_geojson: [
      [14.65, 66.40], [14.55, 66.58], [14.42, 66.78], [14.28, 66.98],
    ],
  },
];

const FALLBACK_VESSELS = [
  {
    mmsi: "419001234",
    name: "MV Ocean Pride",
    vessel_type: "Tanker",
    flag: "IN",
    dark: true,
    speed_knots: 2.1,
    course_deg: 135,
    lat: 15.46,
    lon: 65.90,
    track_geojson: [
      [15.82, 65.35], [15.75, 65.48], [15.68, 65.60], [15.60, 65.72],
      [15.52, 65.82], [15.48, 65.86], [15.46, 65.90],
    ],
    gap_at: 4,
  },
  {
    mmsi: "636019876",
    name: "MT Sea Falcon",
    vessel_type: "Tanker",
    flag: "LR",
    dark: false,
    speed_knots: 11.4,
    course_deg: 95,
    lat: 15.60,
    lon: 66.80,
    track_geojson: [
      [15.72, 64.80], [15.70, 65.20], [15.68, 65.60], [15.65, 66.00],
      [15.63, 66.30], [15.61, 66.60], [15.60, 66.80],
    ],
  },
  {
    mmsi: "353136000",
    name: "MV Coral Trader",
    vessel_type: "Cargo",
    flag: "PA",
    dark: false,
    speed_knots: 12.8,
    course_deg: 265,
    lat: 15.50,
    lon: 64.40,
    track_geojson: [
      [15.35, 66.60], [15.38, 66.20], [15.42, 65.75], [15.45, 65.30],
      [15.48, 64.85], [15.50, 64.40],
    ],
  },
  {
    mmsi: "419876543",
    name: "FV Sagar Kanya",
    vessel_type: "Fishing",
    flag: "IN",
    dark: false,
    speed_knots: 4.2,
    course_deg: 180,
    lat: 15.80,
    lon: 65.40,
    track_geojson: [
      [16.25, 65.38], [16.12, 65.39], [16.00, 65.39], [15.90, 65.40],
      [15.80, 65.40],
    ],
  },
  {
    mmsi: "538005678",
    name: "MT Gulf Spirit",
    vessel_type: "Tanker",
    flag: "MH",
    dark: false,
    speed_knots: 13.1,
    course_deg: 45,
    lat: 15.00,
    lon: 66.60,
    track_geojson: [
      [14.30, 65.80], [14.45, 66.00], [14.60, 66.18], [14.75, 66.35],
      [14.90, 66.50], [15.00, 66.60],
    ],
  },
];

const FALLBACK_CORRELATION = {
  "SPL-2026-0923-001": [
    { vessel_mmsi: "419001234", suspicion_score: 0.91, distance_km: 3.4, time_delta_min: 22, reasoning: "AIS gap 4h, track passes through spill centroid with slowdown" },
    { vessel_mmsi: "353136000", suspicion_score: 0.42, distance_km: 18.2, time_delta_min: 95, reasoning: "Heading intersects spill, no AIS anomaly" },
    { vessel_mmsi: "636019876", suspicion_score: 0.28, distance_km: 41.7, time_delta_min: 210, reasoning: "Within 50km radius, continuous broadcast" },
    { vessel_mmsi: "419876543", suspicion_score: 0.15, distance_km: 62.1, time_delta_min: 340, reasoning: "Fishing vessel, outside drift corridor" },
  ],
  "SPL-2026-0923-002": [
    { vessel_mmsi: "419876543", suspicion_score: 0.68, distance_km: 5.1, time_delta_min: 40, reasoning: "Track passes 5km from spill, slow speed" },
    { vessel_mmsi: "353136000", suspicion_score: 0.31, distance_km: 24.6, time_delta_min: 150, reasoning: "Course intersects drift zone" },
  ],
  "SPL-2026-0922-007": [
    { vessel_mmsi: "538005678", suspicion_score: 0.87, distance_km: 2.8, time_delta_min: 15, reasoning: "Direct track overlap, high speed" },
  ],
};

export default function App() {
  const [activeView, setActiveView] = useState("command"); // 'command' | 'fleet' | 'analytics' | 'drift'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [vessels, setVessels] = useState(FALLBACK_VESSELS);
  const [spills, setSpills] = useState(FALLBACK_SPILLS);
  const [activeSpillId, setActiveSpillId] = useState("SPL-2026-0923-001");
  const [alerts, setAlerts] = useState(FALLBACK_CORRELATION["SPL-2026-0923-001"]);
  const [clock, setClock] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showApis, setShowApis] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Live UTC Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toISOString().slice(11, 19));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch live data from backend
  const refreshData = useCallback(async () => {
    try {
      const [vData, sData] = await Promise.all([
        api.getVessels(),
        api.getSpills(),
      ]);

      if (vData && vData.length > 0) setVessels(vData);
      if (sData && sData.length > 0) setSpills(sData);
    } catch {
      // Backend offline fallback handled gracefully
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 20000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const activeSpill = useMemo(() => {
    return (
      spills.find((s) => (s.spill_code || s.id) === activeSpillId) ||
      spills[0]
    );
  }, [spills, activeSpillId]);

  useEffect(() => {
    if (!activeSpill) return;

    const fetchCorrelation = async () => {
      try {
        const liveAlerts = await api.correlate(activeSpill.id);
        if (liveAlerts && liveAlerts.length > 0) {
          setAlerts(liveAlerts);
          return;
        }
      } catch {
        // Fallback
      }

      const key = activeSpill.spill_code || `SPL-${activeSpill.id}`;
      const fallbackList = FALLBACK_CORRELATION[key] || FALLBACK_CORRELATION["SPL-2026-0923-001"];
      setAlerts(fallbackList);
    };

    fetchCorrelation();
  }, [activeSpill]);

  const topAlert = alerts[0];
  const topVessel = vessels.find((v) => v.mmsi === topAlert?.vessel_mmsi);
  const darkCount = vessels.filter((v) => v.dark).length;

  const handleCommandAction = (actionId) => {
    if (actionId === "view_command") setActiveView("command");
    else if (actionId === "view_fleet") setActiveView("fleet");
    else if (actionId === "view_analytics") setActiveView("analytics");
    else if (actionId === "view_drift") setActiveView("drift");
    else if (actionId === "action_evidence") setShowEvidence(true);
    else if (actionId === "action_dispatch") setShowDispatch(true);
    else if (actionId === "action_apis") setShowApis(true);
    else if (actionId.startsWith("spill_")) {
      const spId = actionId.replace("spill_", "");
      setActiveSpillId(spId);
      setActiveView("command");
    } else if (actionId.startsWith("vessel_")) {
      setActiveView("command");
    }
  };

  const getGridClass = () => {
    if (showLeftPanel && showRightPanel) return "panels-both";
    if (showLeftPanel && !showRightPanel) return "panels-left-only";
    if (!showLeftPanel && showRightPanel) return "panels-right-only";
    return "panels-none";
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Clean Collapsible Sidebar */}
      <SidebarNav
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        darkCount={darkCount}
        spillsCount={spills.length}
        onOpenApis={() => setShowApis(true)}
        onOpenEvidence={() => setShowEvidence(true)}
        onOpenDispatch={() => setShowDispatch(true)}
      />

      {/* Main Content Area */}
      <div className="app-content-wrapper">
        {/* Clean Top Navigation Bar */}
        <TopNav
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          clock={clock}
          darkCount={darkCount}
          spillsCount={spills.length}
          onOpenApis={() => setShowApis(true)}
          onOpenEvidence={() => setShowEvidence(true)}
          onOpenDispatch={() => setShowDispatch(true)}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          unreadCount={3}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
          onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        />

        {/* View Router */}
        <main className="main-view-wrapper">
          {activeView === "command" && (
            <div className={`command-grid-layout ${getGridClass()}`}>
              {/* Left Panel: Spills & Stats */}
              {showLeftPanel && (
                <SpillPanel
                  spills={spills}
                  activeSpillId={activeSpillId}
                  onSelectSpill={(id) => setActiveSpillId(id)}
                  vesselCount={vessels.length}
                  darkCount={darkCount}
                  scenesCount="147"
                />
              )}

              {/* Center Map View */}
              <MapView
                vessels={vessels}
                spills={spills}
                activeSpillId={activeSpillId}
                onSelectSpill={(id) => setActiveSpillId(id)}
                alerts={alerts}
                center={DEFAULT_CENTER}
              />

              {/* Right Panel: Vessel Correlation */}
              {showRightPanel && (
                <VesselCorrelationPanel
                  activeSpill={activeSpill}
                  alerts={alerts}
                  vessels={vessels}
                  onGenerateReport={() => setShowEvidence(true)}
                  onDispatchAlert={() => setShowDispatch(true)}
                />
              )}
            </div>
          )}

          {activeView === "fleet" && (
            <FleetRegistryView
              vessels={vessels}
              onInspectVessel={() => setActiveView("command")}
            />
          )}

          {activeView === "analytics" && (
            <AnalyticsView spills={spills} vessels={vessels} />
          )}

          {activeView === "drift" && (
            <MetOceanView spills={spills} />
          )}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectAction={handleCommandAction}
        spills={spills}
        vessels={vessels}
      />

      {/* Slide-out Incident Notifications Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onSelectSpill={(id) => {
          setActiveSpillId(id);
          setActiveView("command");
        }}
      />

      {/* Live Data Connectors Modal */}
      {showApis && (
        <ExternalApisModal
          activeSpill={activeSpill}
          onClose={() => setShowApis(false)}
        />
      )}

      {/* Legal Evidence Dossier Modal */}
      {showEvidence && (
        <EvidenceModal
          spill={activeSpill}
          topAlert={topAlert}
          topVessel={topVessel}
          onClose={() => setShowEvidence(false)}
        />
      )}

      {/* Coast Guard Intercept Directive Modal */}
      {showDispatch && (
        <DispatchModal
          spill={activeSpill}
          topAlert={topAlert}
          topVessel={topVessel}
          onClose={() => setShowDispatch(false)}
        />
      )}
    </div>
  );
}
