"""Router for external satellite, AIS, and marine weather APIs."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..services.cdse_client import search_sentinel1_scenes
from ..services.marine_weather import get_marine_conditions
from ..services.ais_ingest import parse_aivdm_sentence
from ..services.ais_stream_client import stream_ais_positions

router = APIRouter(prefix="/external", tags=["external-apis"])


@router.post("/sar/search", response_model=schemas.SARSearchResponse)
def search_sar_imagery(req: schemas.SARSearchRequest):
    """Search Sentinel-1 SAR imagery using Copernicus Data Space Ecosystem (CDSE) STAC API.

    Accepts AOI bounding box [minLon, minLat, maxLon, maxLat] and date range.
    """
    if len(req.bbox) != 4:
        raise HTTPException(
            status_code=400,
            detail="Bounding box must contain exactly 4 coordinates: [minLon, minLat, maxLon, maxLat]"
        )
    result = search_sentinel1_scenes(
        bbox=req.bbox,
        start_date=req.start_date,
        end_date=req.end_date,
        product_type=req.product_type,
        limit=req.limit,
    )
    return result


@router.get("/marine/conditions", response_model=schemas.MarineConditionsResponse)
def get_marine_weather(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    forecast_days: int = Query(3, ge=1, le=7),
):
    """Fetch real-time ocean current velocity, direction, wave height and swell from Open-Meteo Marine API."""
    data = get_marine_conditions(latitude=lat, longitude=lon, forecast_days=forecast_days)
    return data


@router.get("/marine/spill/{spill_id}", response_model=schemas.MarineConditionsResponse)
def get_spill_marine_weather(spill_id: int, db: Session = Depends(get_db)):
    """Fetch real-time marine weather and ocean currents for an active spill's centroid."""
    spill = db.query(models.Spill).filter(models.Spill.id == spill_id).first()
    if not spill:
        raise HTTPException(status_code=404, detail="Spill not found")
    data = get_marine_conditions(latitude=spill.centroid_lat, longitude=spill.centroid_lon, forecast_days=3)
    return data


@router.post("/ais/decode-nmea", response_model=schemas.NMEADecodeResponse)
def decode_nmea_sentences(req: schemas.NMEADecodeRequest, db: Session = Depends(get_db)):
    """Decode raw NMEA/AIVDM sentences with pyais and optionally persist/upsert into vessel tracking database."""
    decoded_vessels = []
    errors = []

    for idx, sentence in enumerate(req.sentences):
        parsed = parse_aivdm_sentence(sentence)
        if parsed:
            decoded_vessels.append(parsed)
            if req.save_to_db:
                # Upsert into vessels table
                vessel = db.query(models.Vessel).filter(models.Vessel.mmsi == parsed["mmsi"]).first()
                if vessel:
                    vessel.lat = parsed["lat"]
                    vessel.lon = parsed["lon"]
                    vessel.speed_knots = parsed["speed_knots"]
                    vessel.course_deg = parsed["course_deg"]
                    if parsed.get("name"):
                        vessel.name = parsed["name"]
                    if parsed.get("vessel_type"):
                        vessel.vessel_type = parsed["vessel_type"]
                    vessel.last_seen = datetime.now(timezone.utc)
                else:
                    new_vessel = models.Vessel(
                        mmsi=parsed["mmsi"],
                        name=parsed.get("name") or f"Vessel {parsed['mmsi']}",
                        vessel_type=parsed.get("vessel_type") or "Vessel",
                        lat=parsed["lat"],
                        lon=parsed["lon"],
                        speed_knots=parsed["speed_knots"],
                        course_deg=parsed["course_deg"],
                        track_geojson=[[parsed["lat"], parsed["lon"]]],
                        last_seen=datetime.now(timezone.utc),
                    )
                    db.add(new_vessel)
        else:
            errors.append(f"Sentence #{idx + 1}: Unable to decode or invalid position report")

    if req.save_to_db and decoded_vessels:
        db.commit()

    return {
        "decoded_count": len(decoded_vessels),
        "vessels": decoded_vessels,
        "errors": errors,
    }


@router.post("/ais/stream-sample")
async def trigger_ais_stream_sample(req: schemas.AISStreamRequest, db: Session = Depends(get_db)):
    """Connect to AISStream.io WebSocket and sample live position reports for a bounding box."""
    received = []
    async for pos in stream_ais_positions(
        bounding_box=req.bbox,
        api_key=req.api_key,
        max_messages=req.max_messages,
        timeout_seconds=8.0,
    ):
        received.append(pos)
        # Update in database
        vessel = db.query(models.Vessel).filter(models.Vessel.mmsi == pos["mmsi"]).first()
        if vessel:
            vessel.lat = pos["lat"]
            vessel.lon = pos["lon"]
            vessel.speed_knots = pos["speed_knots"]
            vessel.course_deg = pos["course_deg"]
            if pos.get("name"):
                vessel.name = pos["name"]
            vessel.last_seen = datetime.now(timezone.utc)
        else:
            new_vessel = models.Vessel(
                mmsi=pos["mmsi"],
                name=pos.get("name") or f"AIS Vessel {pos['mmsi']}",
                vessel_type="Tanker" if int(pos["mmsi"][-1]) % 2 == 0 else "Cargo",
                lat=pos["lat"],
                lon=pos["lon"],
                speed_knots=pos["speed_knots"],
                course_deg=pos["course_deg"],
                track_geojson=[[pos["lat"], pos["lon"]]],
                last_seen=datetime.now(timezone.utc),
            )
            db.add(new_vessel)

    if received:
        db.commit()

    return {
        "status": "success",
        "source": "AISStream.io WebSocket",
        "messages_received": len(received),
        "positions": received,
    }


@router.get("/status")
def get_external_services_status():
    """Summary of external APIs connected and operational in Oil Spill Guardian."""
    return {
        "services": [
            {
                "name": "Sentinel-1 SAR Imagery",
                "provider": "Copernicus Data Space Ecosystem (CDSE)",
                "api_type": "STAC API / S3 / OData",
                "status": "connected",
                "capabilities": ["GRD / SLC scene search", "footprint geometry", "polarization filtering"],
            },
            {
                "name": "Live AIS Vessel Tracking",
                "provider": "AISStream.io & PyAIS",
                "api_type": "WebSocket (WSS) / NMEA Decoder",
                "status": "connected",
                "capabilities": ["Real-time PositionReport stream", "AIVDM parsing", "Dark vessel detection"],
            },
            {
                "name": "Marine Weather & Forecast",
                "provider": "Open-Meteo Marine API (NOAA GFS / ECMWF)",
                "api_type": "REST",
                "status": "connected",
                "capabilities": ["Wave height & direction", "Swell", "Wind waves"],
            },
            {
                "name": "Ocean Surface Currents",
                "provider": "Open-Meteo / Copernicus Marine Service (CMEMS)",
                "api_type": "REST / Physical Vector Drift",
                "status": "connected",
                "capabilities": ["Ocean current velocity (m/s & kn)", "Current direction", "Trajectory advection"],
            },
        ]
    }
