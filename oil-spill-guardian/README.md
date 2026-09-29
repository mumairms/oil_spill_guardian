# Oil Spill Guardian — Maritime Surveillance Platform

Scaffold for: *"Leveraging satellite imagery to determine oil spills at sea
along with AIS data correlations to identify the vessel responsible for the
spill."* (PS ID 26143 — Team Deadlock)

This is a **working skeleton**, not a finished product. Every ML/data-science
piece (SAR segmentation, drift prediction, anomaly scoring) is stubbed with a
clearly marked function so you can drop in real models without restructuring
anything. The API contracts, database schema, docker networking, and the
frontend map dashboard are real and runnable today.

## Architecture

```
                 ┌─────────────────┐
  Sentinel-1 ───▶│  sar_detection   │──┐
  SAR imagery    │  (U-Net stub)    │  │
                 └─────────────────┘  │
                                       ▼
  AIS feed   ───▶┌─────────────────┐  ┌───────────────┐   ┌──────────────┐
  (NMEA/AIS)     │  ais_ingest      │─▶│  correlation   │──▶│  FastAPI     │
                 └─────────────────┘  │  engine        │   │  backend     │
  CMEMS currents▶┌─────────────────┐  └───────────────┘   │  + PostGIS   │
                 │ drift_prediction │──────────────────────▶│  + Redis     │
                 └─────────────────┘                       └──────┬───────┘
                                                                   │ REST/JSON
                                                                   ▼
                                                        ┌─────────────────────┐
                                                        │ React + Leaflet      │
                                                        │ operator dashboard   │
                                                        └─────────────────────┘
```

- **backend/** — FastAPI service. PostGIS stores vessel tracks and spill
  polygons as real geometries so you can do spatial queries (e.g. "which
  vessels were within 5km of this spill polygon in the last 6 hours").
  Redis is wired in for the async job queue (SAR image processing is slow,
  so it never blocks a request).
- **frontend/** — Vite + React + Leaflet dashboard. Polls the backend for
  active spills and nearby vessels, renders them on a map, and lists
  auto-generated "probable responsible vessel" alerts.
- **docker-compose.yml** — spins up Postgres+PostGIS, Redis, and the backend
  together with one command.

## Where the "AI" goes

Three files contain a `# TODO: replace stub` marker — this is the entire
surface area for the actual data-science work:

| File | Replace stub with |
|---|---|
| `backend/app/services/sar_detection.py` | Real U-Net inference on Sentinel-1 SAR tiles → spill polygon (GeoJSON) |
| `backend/app/services/correlation.py` | Real AIS trajectory scoring (speed/course/proximity/time) → ranked suspect vessels |
| `backend/app/services/drift_prediction.py` | Real ocean-current/wind drift model (e.g. OpenDrift + CMEMS currents) |

Everything else (routes, DB schema, dashboard) already expects the *shape*
of data these will eventually produce, so plugging in real models is a
drop-in replacement, not a rewrite.

## Running it

```bash
# 1. Backend + DB + Redis
docker compose up --build

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:8000/docs (interactive Swagger UI)
Frontend: http://localhost:5173

The backend seeds a few fake vessels + a fake spill on startup so the
dashboard has something to show immediately — see `app/db.py::seed_demo_data`.

## Opening this in Antigravity

Just point Antigravity at this folder. Good first tasks to hand it:
1. "Implement `sar_detection.detect_spill()` using a real U-Net checkpoint
   and return a GeoJSON polygon instead of the stub."
2. "Add a WebSocket endpoint so the dashboard gets live vessel positions
   instead of polling."
3. "Write the AIS ingest parser for real NMEA/AIVDM sentences in
   `ais_ingest.py`."
4. "Add authentication (JWT) to the API so only coast-guard operators can
   see alerts."

## Suggested next milestones

1. Swap the seeded demo data for a real historical spill dataset to
   validate the correlation logic end-to-end.
2. Replace polling with WebSockets for live vessel tracking.
3. Add the geofencing/dark-vessel-detection rules (AIS transponder gaps)
   mentioned in the problem statement.
4. Containerize the frontend and add it to `docker-compose.yml`.
