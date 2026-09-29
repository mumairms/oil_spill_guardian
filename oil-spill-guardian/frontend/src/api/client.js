const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error ${res.status} on ${path}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Core Platform
  getVessels: () => request("/vessels/"),
  getVessel: (mmsi) => request(`/vessels/${mmsi}`),
  getSpills: () => request("/spills/"),
  getSpill: (spillId) => request(`/spills/${spillId}`),
  getAlerts: () => request("/alerts/"),
  correlate: (spillId) =>
    request(`/spills/${spillId}/correlate`, { method: "POST" }),
  getDrift: (spillId, hoursAhead = 24) =>
    request(`/spills/${spillId}/drift?hours_ahead=${hoursAhead}`),
  detectSpill: (imagePath, capturedAt) =>
    request("/spills/detect", {
      method: "POST",
      body: JSON.stringify({ image_path: imagePath, captured_at: capturedAt }),
    }),

  // External Satellite (Sentinel-1 / CDSE)
  searchSAR: (bbox, startDate, endDate, productType = "GRD", limit = 10) =>
    request("/external/sar/search", {
      method: "POST",
      body: JSON.stringify({
        bbox,
        start_date: startDate,
        end_date: endDate,
        product_type: productType,
        limit,
      }),
    }),

  // Marine Weather & Ocean Currents (Open-Meteo & CMEMS)
  getMarineConditions: (lat, lon, forecastDays = 3) =>
    request(`/external/marine/conditions?lat=${lat}&lon=${lon}&forecast_days=${forecastDays}`),
  getSpillMarineConditions: (spillId) =>
    request(`/external/marine/spill/${spillId}`),

  // Live AIS Ingest & pyais NMEA Decoding
  decodeNMEA: (sentences, saveToDb = false) =>
    request("/external/ais/decode-nmea", {
      method: "POST",
      body: JSON.stringify({ sentences, save_to_db: saveToDb }),
    }),
  sampleAISStream: (bbox, apiKey = null, maxMessages = 10) =>
    request("/external/ais/stream-sample", {
      method: "POST",
      body: JSON.stringify({ bbox, api_key: apiKey, max_messages: maxMessages }),
    }),

  // System & Providers Status
  getExternalStatus: () => request("/external/status"),
};
