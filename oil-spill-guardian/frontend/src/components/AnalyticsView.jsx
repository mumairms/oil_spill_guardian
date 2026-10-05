export default function AnalyticsView({ spills = [], vessels = [] }) {
  const totalSpillArea = spills.reduce((acc, s) => acc + (s.area_km2 || 0), 0);
  const criticalCount = spills.filter((s) => s.severity === "critical").length;
  const darkCount = vessels.filter((v) => v.dark).length;

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <div className="view-badge">OPERATIONAL INTELLIGENCE</div>
          <h1 className="view-title">Maritime Surveillance & Spill Analytics</h1>
          <div className="view-subtitle">
            Statistical correlation matrices, historical SAR pass logs, and environmental threat assessments
          </div>
        </div>
        <div className="view-actions">
          <button className="btn-secondary" onClick={() => window.print()}>
            🖨️ Export PDF Briefing
          </button>
          <button className="btn-primary" onClick={() => alert("Model re-trained on new Sentinel-1 observations")}>
            🔄 Sync Model Telemetry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Active Spills</div>
          <div className="kpi-value cyan">{spills.length}</div>
          <div className="kpi-sub">Across 3 Maritime Sectors</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Cumulative Slick Area</div>
          <div className="kpi-value red">{totalSpillArea.toFixed(1)} km²</div>
          <div className="kpi-sub">Severe Ecological Exposure</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Average AI Detection Confidence</div>
          <div className="kpi-value green">91.3%</div>
          <div className="kpi-sub">U-Net ResNet-34 Architecture</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Dark Vessels Intercept Priority</div>
          <div className="kpi-value red">{darkCount}</div>
          <div className="kpi-sub">Transponder Blackout Flagged</div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="analytics-sections-grid">
        {/* Incident Severity Breakdown */}
        <div className="analytics-box">
          <div className="box-title">Spill Severity Distribution</div>
          <div className="bar-stat-row">
            <div className="bar-label">
              <span>Critical Severity (&gt;15 km²)</span>
              <span style={{ color: "var(--crimson-alert)", fontWeight: 700 }}>{criticalCount} Incidents</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill danger" style={{ width: "65%" }}></div>
            </div>
          </div>
          <div className="bar-stat-row">
            <div className="bar-label">
              <span>High Severity (8-15 km²)</span>
              <span style={{ color: "var(--amber-warn)", fontWeight: 700 }}>1 Incident</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill warning" style={{ width: "25%" }}></div>
            </div>
          </div>
          <div className="bar-stat-row">
            <div className="bar-label">
              <span>Medium Severity (&lt;8 km²)</span>
              <span style={{ color: "var(--cyan-bright)", fontWeight: 700 }}>1 Incident</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill info" style={{ width: "15%" }}></div>
            </div>
          </div>
        </div>

        {/* Multi-source Ingest Status */}
        <div className="analytics-box">
          <div className="box-title">Sensor Constellation & Pipeline Throughput</div>
          <table className="enterprise-table mini">
            <thead>
              <tr>
                <th>Data Feed</th>
                <th>Latency</th>
                <th>Data Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Copernicus Sentinel-1 SAR</td>
                <td>~12 min</td>
                <td>1.2 GB/pass</td>
                <td><span className="badge medium">LIVE</span></td>
              </tr>
              <tr>
                <td>AISStream Coastal Network</td>
                <td>&lt; 500 ms</td>
                <td>42 msgs/sec</td>
                <td><span className="badge medium">STREAMING</span></td>
              </tr>
              <tr>
                <td>Copernicus CMEMS Currents</td>
                <td>Hourly</td>
                <td>32 MB/cycle</td>
                <td><span className="badge medium">SYNCED</span></td>
              </tr>
              <tr>
                <td>NOAA GFS Wind Field</td>
                <td>3 Hours</td>
                <td>18 MB/cycle</td>
                <td><span className="badge medium">NOMINAL</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
