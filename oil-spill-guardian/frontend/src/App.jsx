import { useEffect, useState, useCallback, useMemo } from "react";
import "./App.css";
import MapView from "./components/MapView.jsx";
import SpillPanel from "./components/SpillPanel.jsx";
import VesselCorrelationPanel from "./components/VesselCorrelationPanel.jsx";
import EvidenceModal from "./components/EvidenceModal.jsx";
import DispatchModal from "./components/DispatchModal.jsx";
import ExternalApisModal from "./components/ExternalApisModal.jsx";
import { api } from "./api/client.js";

const DEFAULT_CENTER = [19.05, 72.85];

// Demo dataset fallback to ensure instantaneous and rich offline demonstration
const FALLBACK_SPILLS = [
  {
    id: 1,
    spill_code: "SPL-2026-0923-001",
    scene: "S1A_IW_GRDH_20260923T1332",
    detected_at: "2026-09-23T13:32:00Z",
    confidence: 0.94,
    area_km2: 18.7,
    severity: "critical",
    centroid_lat: 19.08,
    centroid_lon: 72.84,
    polygon_geojson: {
      type: "Polygon",
      coordinates: [[
        [72.72, 19.08], [72.76, 19.12], [72.83, 19.15], [72.90, 19.14],
        [72.95, 19.10], [72.96, 19.04], [72.92, 18.99], [72.84, 18.97],
        [72.77, 18.99], [72.72, 19.03], [72.72, 19.08],
      ]],
    },
    drift_geojson: [
      [19.04, 72.80], [19.02, 72.92], [18.98, 73.04], [18.92, 73.15], [18.85, 73.24],
    ],
  },
  {
    id: 2,
    spill_code: "SPL-2026-0923-002",
    scene: "S1B_IW_GRDH_20260923T0418",
    detected_at: "2026-09-23T04:18:00Z",
    confidence: 0.81,
    area_km2: 6.3,
    severity: "high",
    centroid_lat: 19.32,
    centroid_lon: 72.61,
    polygon_geojson: {
      type: "Polygon",
      coordinates: [[
        [72.55, 19.32], [72.58, 19.36], [72.63, 19.38], [72.67, 19.35],
        [72.66, 19.30], [72.61, 19.27], [72.56, 19.28], [72.55, 19.32],
      ]],
    },
    drift_geojson: [
      [19.32, 72.60], [19.30, 72.70], [19.26, 72.80], [19.20, 72.88],
    ],
  },
  {
    id: 3,
    spill_code: "SPL-2026-0922-007",
    scene: "S1A_IW_GRDH_20260922T1330",
    detected_at: "2026-09-22T13:30:00Z",
    confidence: 0.88,
    area_km2: 11.2,
    severity: "medium",
    centroid_lat: 18.78,
    centroid_lon: 73.02,
    polygon_geojson: {
      type: "Polygon",
      coordinates: [[
        [72.95, 18.78], [72.99, 18.82], [73.05, 18.84], [73.09, 18.80],
        [73.08, 18.75], [73.02, 18.72], [72.96, 18.73], [72.95, 18.78],
      ]],
    },
    drift_geojson: [
      [18.78, 73.00], [18.74, 73.10], [18.68, 73.18], [18.60, 73.24],
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
    course_deg: 210,
    lat: 19.06,
    lon: 72.88,
    track_geojson: [
      [19.28, 72.60], [19.24, 72.66], [19.19, 72.71], [19.15, 72.75],
      [19.11, 72.79], [19.08, 72.83], [19.06, 72.88],
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
    lat: 19.14,
    lon: 73.20,
    track_geojson: [
      [19.20, 72.30], [19.19, 72.45], [19.18, 72.60], [19.17, 72.75],
      [19.16, 72.90], [19.15, 73.05], [19.14, 73.20],
    ],
  },
  {
    mmsi: "353136000",
    name: "MV Coral Trader",
    vessel_type: "Cargo",
    flag: "PA",
    dark: false,
    speed_knots: 12.8,
    course_deg: 270,
    lat: 19.10,
    lon: 72.20,
    track_geojson: [
      [19.05, 72.95], [19.06, 72.80], [19.07, 72.65], [19.08, 72.50],
      [19.09, 72.35], [19.10, 72.20],
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
    lat: 19.20,
    lon: 72.75,
    track_geojson: [
      [19.40, 72.70], [19.36, 72.71], [19.32, 72.72], [19.28, 72.73],
      [19.24, 72.74], [19.20, 72.75],
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
    lat: 19.00,
    lon: 73.20,
    track_geojson: [
      [18.70, 72.90], [18.76, 72.96], [18.82, 73.02], [18.88, 73.08],
      [18.94, 73.14], [19.00, 73.20],
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
    { vessel_mmsi: "636019876", suspicion_score: 0.12, distance_km: 78.3, time_delta_min: 420, reasoning: "Outside primary search window" },
  ],
  "SPL-2026-0922-007": [
    { vessel_mmsi: "538005678", suspicion_score: 0.87, distance_km: 2.8, time_delta_min: 15, reasoning: "Direct track overlap, high speed" },
    { vessel_mmsi: "353136000", suspicion_score: 0.36, distance_km: 31.2, time_delta_min: 180, reasoning: "Within regional search radius" },
  ],
};

export default function App() {
  const [vessels, setVessels] = useState(FALLBACK_VESSELS);
  const [spills, setSpills] = useState(FALLBACK_SPILLS);
  const [activeSpillId, setActiveSpillId] = useState("SPL-2026-0923-001");
  const [alerts, setAlerts] = useState(FALLBACK_CORRELATION["SPL-2026-0923-001"]);
  const [clock, setClock] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showApis, setShowApis] = useState(false);

  // Live UTC Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(now.toISOString().slice(11, 19) + " UTC");
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live data from backend
  const refreshData = useCallback(async () => {
    try {
      const [vData, sData] = await Promise.all([
        api.getVessels(),
        api.getSpills(),
      ]);

      if (vData && vData.length > 0) setVessels(vData);
      if (sData && sData.length > 0) {
        setSpills(sData);
      }
    } catch {
      // Backend not running or error - fallback to seeded state
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 20000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Update correlation alerts when active spill changes
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
        // Use correlation matrix fallback
      }

      const key = activeSpill.spill_code || `SPL-${activeSpill.id}`;
      const fallbackList = FALLBACK_CORRELATION[key] || FALLBACK_CORRELATION["SPL-2026-0923-001"];
      setAlerts(fallbackList);
    };

    fetchCorrelation();
  }, [activeSpill]);

  const topAlert = alerts[0];
  const topVessel = vessels.find((v) => v.mmsi === topAlert?.vessel_mmsi);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="dot"></div>
          Deadlock <span className="sub">OilWatch — Maritime Surveillance</span>
        </div>
        <div className="status-bar">
          <button
            onClick={() => setShowApis(true)}
            style={{
              background: "#1e293b",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            🛰️ Live APIs & Connectors
          </button>
          <span>
            SAR Feed <b>●</b> Live
          </span>
          <span>
            AIS Feed <b>●</b> Live
          </span>
          <span className="warn">
            Currents <b>●</b> Synced
          </span>
          <span id="clock">{clock || "--:--:-- UTC"}</span>
        </div>
      </header>

      {/* Left Panel: Spills & Stats */}
      <SpillPanel
        spills={spills}
        activeSpillId={activeSpillId}
        onSelectSpill={(id) => setActiveSpillId(id)}
        vesselCount="1,284"
        darkCount="3"
        scenesCount="147"
      />

      {/* Center: Map */}
      <MapView
        vessels={vessels}
        spills={spills}
        activeSpillId={activeSpillId}
        onSelectSpill={(id) => setActiveSpillId(id)}
        alerts={alerts}
        center={DEFAULT_CENTER}
      />

      {/* Right Panel: Vessel Correlation & Actions */}
      <VesselCorrelationPanel
        activeSpill={activeSpill}
        alerts={alerts}
        vessels={vessels}
        onGenerateReport={() => setShowEvidence(true)}
        onDispatchAlert={() => setShowDispatch(true)}
      />

      {/* External APIs Modal */}
      {showApis && (
        <ExternalApisModal
          activeSpill={activeSpill}
          onClose={() => setShowApis(false)}
        />
      )}

      {/* Evidence Report Modal */}
      {showEvidence && (
        <EvidenceModal
          spill={activeSpill}
          topAlert={topAlert}
          topVessel={topVessel}
          onClose={() => setShowEvidence(false)}
        />
      )}

      {/* Dispatch Alert Modal */}
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
