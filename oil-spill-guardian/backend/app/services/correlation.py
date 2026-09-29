"""Spill ↔ vessel correlation engine — multi-factor attribution logic."""

import math
from typing import TypedDict, Optional, List


class VesselLike(TypedDict, total=False):
    mmsi: str
    name: Optional[str]
    vessel_type: Optional[str]
    lat: float
    lon: float
    speed_knots: float
    course_deg: Optional[float]
    dark: Optional[bool]
    track_geojson: Optional[List[List[float]]]
    gap_at: Optional[int]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def score_vessel(vessel: VesselLike, spill_centroid_lat: float,
                 spill_centroid_lon: float, radius_km: float = 60.0) -> dict:
    """Computes multi-factor attribution suspicion score (0-1)."""
    track = vessel.get("track_geojson") or [[vessel["lat"], vessel["lon"]]]
    
    # 1. Minimum distance from any point in the track to spill centroid
    min_dist = min(_haversine_km(pt[0], pt[1], spill_centroid_lat, spill_centroid_lon) for pt in track)
    
    # Time delta simulation based on distance/speed
    speed = max(0.5, vessel.get("speed_knots", 10.0))
    time_delta_min = max(5, int((min_dist / speed) * 60))

    # Proximity score (0 to 1)
    if min_dist > 100:
        dist_score = 0.0
    else:
        dist_score = max(0.0, 1.0 - (min_dist / 60.0))

    # Anomaly score (dark vessel / AIS gap / anomalous slow speed)
    anomaly_score = 0.0
    reasons = []
    
    if vessel.get("dark"):
        anomaly_score += 0.45
        reasons.append("AIS gap detected along trajectory")
    
    if speed < 3.5 and vessel.get("vessel_type") in ("Tanker", "Cargo"):
        anomaly_score += 0.25
        reasons.append("Speed anomaly / discharge slowdown (<3.5 kn)")

    # Vessel type score
    type_weight = 0.1
    v_type = vessel.get("vessel_type", "Unknown")
    if v_type == "Tanker":
        type_weight = 0.2
    elif v_type == "Cargo":
        type_weight = 0.15

    # Composite score calculation: 45% distance + 35% anomaly + 20% type
    raw_score = (0.45 * dist_score) + (0.35 * anomaly_score) + type_weight
    
    # Specific reason string assembly
    if min_dist < 5.0 and vessel.get("dark"):
        reason = f"AIS gap {vessel.get('gap_at', 4)}h, track passes within {min_dist:.1f} km of spill centroid"
    elif min_dist < 8.0:
        reason = f"Track passes {min_dist:.1f} km from spill, speed {speed:.1f} kn ({v_type})"
    elif min_dist < 25.0:
        reason = f"Heading/track intersects spill area, {min_dist:.1f} km away, {time_delta_min}m delta"
    else:
        reason = f"Within regional search radius ({min_dist:.1f} km, {time_delta_min}m delta)"

    suspicion_score = min(0.99, max(0.1, round(raw_score, 2)))

    return {
        "mmsi": vessel["mmsi"],
        "suspicion_score": suspicion_score,
        "distance_km": round(min_dist, 1),
        "time_delta_min": time_delta_min,
        "reasoning": reason,
    }


def rank_candidates(vessels: list[VesselLike], spill_centroid_lat: float,
                     spill_centroid_lon: float, radius_km: float = 60.0, top_n: int = 10):
    scored = []
    for v in vessels:
        res = score_vessel(v, spill_centroid_lat, spill_centroid_lon, radius_km)
        scored.append(res)
    scored.sort(key=lambda x: x["suspicion_score"], reverse=True)
    return scored[:top_n]

