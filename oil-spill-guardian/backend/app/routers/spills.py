from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import CORRELATION_RADIUS_KM
from ..db import get_db
from ..services import sar_detection, correlation, drift_prediction

router = APIRouter(prefix="/spills", tags=["spills"])


@router.get("/", response_model=list[schemas.SpillOut])
def list_spills(db: Session = Depends(get_db)):
    return db.query(models.Spill).order_by(models.Spill.detected_at.desc()).all()


@router.get("/{spill_id}", response_model=schemas.SpillOut)
def get_spill(spill_id: int, db: Session = Depends(get_db)):
    spill = db.query(models.Spill).get(spill_id)
    if not spill:
        raise HTTPException(status_code=404, detail="Spill not found")
    return spill


@router.post("/detect", response_model=schemas.SpillOut)
def run_detection(req: schemas.SARDetectionRequest, db: Session = Depends(get_db)):
    """Kick off SAR-based detection on a given image. In production this
    would be queued to a worker (Celery/RQ against the Redis instance)
    since inference is slow; called synchronously here for simplicity."""
    result = sar_detection.detect_spill(req.image_path, req.captured_at)
    if result is None:
        raise HTTPException(status_code=204, detail="No spill detected")

    spill = models.Spill(
        centroid_lat=result["centroid_lat"],
        centroid_lon=result["centroid_lon"],
        polygon_geojson=result["polygon_geojson"],
        area_km2=result["area_km2"],
        confidence=result["confidence"],
        source_image=req.image_path,
        status="active",
    )
    db.add(spill)
    db.commit()
    db.refresh(spill)
    return spill


@router.get("/{spill_id}/correlate", response_model=list[schemas.AlertOut])
@router.post("/{spill_id}/correlate", response_model=list[schemas.AlertOut])
def run_correlation(spill_id: int, db: Session = Depends(get_db)):
    """Run the AIS correlation engine for a spill and persist ranked
    candidate vessels as Alerts with multi-factor scoring breakdown."""
    spill = db.query(models.Spill).get(spill_id)
    if not spill:
        raise HTTPException(status_code=404, detail="Spill not found")

    vessels = db.query(models.Vessel).all()
    vessel_dicts = [
        {
            "mmsi": v.mmsi,
            "name": v.name,
            "vessel_type": v.vessel_type,
            "flag": v.flag,
            "lat": v.lat,
            "lon": v.lon,
            "speed_knots": v.speed_knots,
            "course_deg": v.course_deg,
            "dark": v.dark,
            "track_geojson": v.track_geojson,
            "gap_at": v.gap_at,
        }
        for v in vessels
    ]
    ranked = correlation.rank_candidates(
        vessel_dicts, spill.centroid_lat, spill.centroid_lon, 60.0
    )

    alerts = []
    # Clear previous alerts for this spill to avoid duplicates
    db.query(models.Alert).filter(models.Alert.spill_id == spill.id).delete()

    for r in ranked:
        alert = models.Alert(
            spill_id=spill.id,
            vessel_mmsi=r["vessel_mmsi"] if "vessel_mmsi" in r else r.get("mmsi"),
            suspicion_score=r["suspicion_score"],
            distance_km=r.get("distance_km"),
            time_delta_min=r.get("time_delta_min"),
            reasoning=r["reasoning"],
            factors=r.get("factors"),
        )
        db.add(alert)
        alerts.append(alert)
    db.commit()
    for a in alerts:
        db.refresh(a)
    return alerts


@router.get("/{spill_id}/drift")
def get_drift(spill_id: int, hours_ahead: int = 24, db: Session = Depends(get_db)):
    spill = db.query(models.Spill).get(spill_id)
    if not spill:
        raise HTTPException(status_code=404, detail="Spill not found")
    return drift_prediction.predict_drift(spill.centroid_lat, spill.centroid_lon, hours_ahead)
