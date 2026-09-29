from datetime import datetime
from typing import Optional, Any, List, Dict
from pydantic import BaseModel, ConfigDict


class VesselOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mmsi: str
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = "UN"
    dark: bool = False
    lat: float
    lon: float
    speed_knots: float
    course_deg: float
    track_geojson: Optional[Any] = None
    gap_at: Optional[int] = None
    last_seen: datetime


class SpillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spill_code: Optional[str] = None
    detected_at: datetime
    centroid_lat: float
    centroid_lon: float
    polygon_geojson: Any
    drift_geojson: Optional[Any] = None
    area_km2: Optional[float] = None
    confidence: Optional[float] = None
    severity: Optional[str] = "high"
    source_image: Optional[str] = None
    status: str


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spill_id: int
    vessel_mmsi: str
    suspicion_score: float
    distance_km: Optional[float] = None
    time_delta_min: Optional[int] = None
    reasoning: Optional[str] = None
    created_at: datetime


class SARDetectionRequest(BaseModel):
    image_path: str
    captured_at: datetime


class DriftPredictionRequest(BaseModel):
    spill_id: int
    hours_ahead: int = 24


class SARSearchRequest(BaseModel):
    bbox: List[float]  # [minLon, minLat, maxLon, maxLat]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    product_type: str = "GRD"
    limit: int = 10


class SARSearchResponse(BaseModel):
    source: str
    total_matched: int
    count: int
    bbox: List[float]
    datetime_range: str
    scenes: List[Dict[str, Any]]


class MarineConditionsResponse(BaseModel):
    source: str
    latitude: float
    longitude: float
    current_conditions: Dict[str, Any]
    hourly_forecast: Optional[Dict[str, Any]] = None


class NMEADecodeRequest(BaseModel):
    sentences: List[str]
    save_to_db: bool = False


class NMEADecodeResponse(BaseModel):
    decoded_count: int
    vessels: List[Dict[str, Any]]
    errors: List[str]


class AISStreamRequest(BaseModel):
    bbox: List[List[float]]  # [[[minLat, minLon], [maxLat, maxLon]]]
    api_key: Optional[str] = None
    max_messages: int = 10
