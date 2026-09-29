from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/vessels", tags=["vessels"])


@router.get("/", response_model=list[schemas.VesselOut])
def list_vessels(db: Session = Depends(get_db)):
    return db.query(models.Vessel).all()


@router.get("/{mmsi}", response_model=schemas.VesselOut)
def get_vessel(mmsi: str, db: Session = Depends(get_db)):
    vessel = db.query(models.Vessel).filter(models.Vessel.mmsi == mmsi).first()
    if not vessel:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel
