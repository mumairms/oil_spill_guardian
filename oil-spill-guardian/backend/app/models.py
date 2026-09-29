from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.sql import func

from .db import Base


class Vessel(Base):
    """Latest known AIS position for a vessel and historical track."""

    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True)
    mmsi = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    vessel_type = Column(String, nullable=True)
    flag = Column(String, default="UN")
    dark = Column(Boolean, default=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    speed_knots = Column(Float, default=0.0)
    course_deg = Column(Float, default=0.0)
    track_geojson = Column(JSON, nullable=True)
    gap_at = Column(Integer, nullable=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())


class Spill(Base):
    """A detected oil-spill event, produced by the SAR detection service."""

    __tablename__ = "spills"

    id = Column(Integer, primary_key=True)
    spill_code = Column(String, unique=True, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    polygon_geojson = Column(JSON, nullable=False)
    drift_geojson = Column(JSON, nullable=True)
    area_km2 = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    severity = Column(String, default="high")  # critical | high | medium | low
    source_image = Column(String, nullable=True)
    status = Column(String, default="active")  # active | resolved | false_positive


class Alert(Base):
    """Output of the correlation engine: a ranked 'probable responsible vessel' for a given spill."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    spill_id = Column(Integer, nullable=False)
    vessel_mmsi = Column(String, nullable=False)
    suspicion_score = Column(Float, nullable=False)  # 0-1
    distance_km = Column(Float, nullable=True)
    time_delta_min = Column(Integer, nullable=True)
    reasoning = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

