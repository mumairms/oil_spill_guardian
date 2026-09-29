"""AIS feed ingestion and AIVDM decoding service.

Supports:
  1. Decoding raw AIVDM/NMEA sentences with pyais into standardized VesselPosition objects.
  2. AIS transponder gap detection for identifying dark vessels.
  3. Upserting vessel positions and trajectories into the database.
"""

from datetime import datetime, timezone
import logging
from typing import Optional, TypedDict, List
from pyais import decode

logger = logging.getLogger(__name__)


class VesselPosition(TypedDict):
    mmsi: str
    name: Optional[str]
    vessel_type: Optional[str]
    lat: float
    lon: float
    speed_knots: float
    course_deg: float
    timestamp: datetime


def parse_aivdm_sentence(raw_sentence: str) -> Optional[VesselPosition]:
    """Decode a real AIVDM/NMEA sentence using pyais."""
    try:
        msg = decode(raw_sentence.strip())
        mmsi = str(getattr(msg, "mmsi", ""))
        lat = getattr(msg, "lat", None)
        lon = getattr(msg, "lon", None)
        speed = getattr(msg, "speed", 0.0) or 0.0
        course = getattr(msg, "course", 0.0) or 0.0
        shipname = getattr(msg, "shipname", None)
        shiptype = getattr(msg, "ship_type", None)

        if lat is None or lon is None:
            # Type 5 static reports or messages without lat/lon
            return None

        # Filter invalid GPS coordinates (91 / 181 are standard AIS invalid values)
        if abs(lat) > 90.0 or abs(lon) > 180.0:
            return None

        v_type_str = "Vessel"
        if shiptype:
            shiptype_int = int(shiptype)
            if 80 <= shiptype_int <= 89:
                v_type_str = "Tanker"
            elif 70 <= shiptype_int <= 79:
                v_type_str = "Cargo"
            elif 30 <= shiptype_int <= 39:
                v_type_str = "Fishing"

        return {
            "mmsi": mmsi,
            "name": str(shipname).strip() if shipname else None,
            "vessel_type": v_type_str,
            "lat": round(float(lat), 5),
            "lon": round(float(lon), 5),
            "speed_knots": round(float(speed), 1),
            "course_deg": round(float(course), 1),
            "timestamp": datetime.now(timezone.utc),
        }
    except Exception as e:
        logger.debug(f"Failed to decode AIVDM sentence '{raw_sentence}': {e}")
        return None


def detect_ais_gap(
    previous_timestamp: datetime,
    current_timestamp: datetime,
    gap_threshold_minutes: int = 30,
) -> bool:
    """Flag if a vessel went silent for longer than the threshold (dark vessel heuristic)."""
    if not previous_timestamp or not current_timestamp:
        return False
    gap_seconds = abs((current_timestamp - previous_timestamp).total_seconds())
    return (gap_seconds / 60.0) > gap_threshold_minutes
