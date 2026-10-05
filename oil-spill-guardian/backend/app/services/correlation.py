"""Spill ↔ Vessel Correlation & Early Warning Prevention Engine.

Implements the official SIH 2026 / NTRO (PS ID 26143) Multi-Factor Suspect Attribution
and Pre-Port Entry Vessel Risk Profiling formulas.
"""

import math
from datetime import datetime, timezone
from typing import TypedDict, Optional, List, Dict, Any


class VesselLike(TypedDict, total=False):
    mmsi: str
    name: Optional[str]
    vessel_type: Optional[str]
    flag: Optional[str]
    lat: float
    lon: float
    speed_knots: float
    course_deg: Optional[float]
    dark: Optional[bool]
    track_geojson: Optional[List[List[float]]]
    gap_at: Optional[int]
    age_years: Optional[float]
    defect_score: Optional[float]
    flag_state_risk: Optional[float]
    prior_anomalies: Optional[int]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes geodesic distance d between two coordinates using the Haversine formula (EarthRadius = 6,371 km)."""
    r = 6371.0
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def calculate_pre_port_risk_index(vessel: VesselLike) -> float:
    """Calculates Pre-Port Entry Vessel Risk Index (Section 4.1).

    Risk Index = w1 * VesselAge + w2 * DefectHistory + w3 * FlagStateRisk + w4 * PriorAnomalies
    Where weights: w1=0.30, w2=0.35, w3=0.15, w4=0.20.
    High-risk vessels (Score > 0.75) are flagged for mandatory physical inspection.
    """
    age_norm = min(1.0, (vessel.get("age_years", 14.0) / 25.0))
    defect_norm = min(1.0, vessel.get("defect_score", 0.65))
    flag_norm = 0.85 if vessel.get("flag") in ("PA", "LR", "MH", "BZ") else 0.30
    anomaly_norm = 1.0 if vessel.get("dark") else min(1.0, (vessel.get("prior_anomalies", 1) / 3.0))

    risk_score = (0.30 * age_norm) + (0.35 * defect_norm) + (0.15 * flag_norm) + (0.20 * anomaly_norm)
    return round(risk_score, 3)


def check_geofence_anomalies(vessel: VesselLike) -> List[str]:
    """Evaluates Phase 1 real-time geofence breaches, transponder cut-offs, and loitering."""
    alerts = []
    speed = vessel.get("speed_knots", 10.0)

    # 1. Dark ship / Transponder cut-off
    if vessel.get("dark"):
        alerts.append("AIS Transponder Cut-Off Detected: Vessel gapped signal in high-seas corridor")

    # 2. Loitering alert: Slow speed < 5 knots in open ocean / night
    if speed < 5.0 and vessel.get("vessel_type") in ("Tanker", "Cargo"):
        alerts.append(f"Loitering Alert: Speed dropped to {speed:.1f} kn in open ocean (Bilge discharge signature)")

    return alerts


def score_vessel(
    vessel: VesselLike,
    spill_centroid_lat: float,
    spill_centroid_lon: float,
    spill_detected_at: Optional[datetime] = None,
    drift_heading_deg: float = 135.0,
    search_radius_km: float = 60.0,
    lookback_hours: float = 12.0,
) -> Dict[str, Any]:
    """Calculates Section 6.2 Multi-Factor Suspect Responsibility Score (0% to 100%).

    Formula:
      Score (%) = [ w1*f1 + w2*f2 + w3*f3 + w4*f4 + w5*f5 + w6*f6 ] * 100
      - f1 (Distance) = max(0, 1 - d / R)
      - f2 (Time Delta) = max(0, 1 - |T_vessel - T_spill| / Delta T)
      - f3 (Vessel Type) = Tanker: 1.0 | Cargo: 0.7 | Fishing: 0.4 | Other: 0.2
      - f4 (Speed Anomaly) = 1 - |ObservedSpeed - CruiseSpeed| / CruiseSpeed
      - f5 (Course Drift) = max(0, cos(Theta_vessel - Theta_drift))
      - f6 (AIS Gap Penalty) = min(1.0, GapDuration_hours / 6.0)
    Weights: w1=0.30, w2=0.25, w3=0.15, w4=0.10, w5=0.10, w6=0.10.
    """
    track = vessel.get("track_geojson") or [[vessel["lat"], vessel["lon"]]]

    # 1. Minimum geodesic distance d
    min_dist_km = min(haversine_km(pt[0], pt[1], spill_centroid_lat, spill_centroid_lon) for pt in track)
    f1_distance = max(0.0, 1.0 - (min_dist_km / search_radius_km))

    # 2. Time Delta f2
    time_delta_h = max(0.3, min_dist_km / max(1.0, vessel.get("speed_knots", 12.0)))
    f2_time = max(0.0, 1.0 - (time_delta_h / lookback_hours))
    time_delta_min = int(time_delta_h * 60)

    # 3. Vessel Type f3
    v_type = vessel.get("vessel_type", "Tanker")
    if v_type == "Tanker":
        f3_type = 1.0
    elif v_type == "Cargo":
        f3_type = 0.7
    elif v_type == "Fishing":
        f3_type = 0.4
    else:
        f3_type = 0.2

    # 4. Speed Anomaly f4 (CruiseSpeed baseline = 14.0 kn)
    cruise_speed = 14.0
    observed_speed = vessel.get("speed_knots", 10.0)
    f4_speed = max(0.0, 1.0 - abs(observed_speed - cruise_speed) / cruise_speed)

    # 5. Course Drift Alignment f5 = cos(Theta_vessel - Theta_drift)
    course_deg = vessel.get("course_deg") if vessel.get("course_deg") is not None else 180.0
    diff_rad = math.radians(abs(course_deg - drift_heading_deg))
    f5_drift = max(0.0, math.cos(diff_rad))

    # 6. AIS Gap Penalty f6 = min(1.0, GapDuration / 6.0)
    gap_hours = float(vessel.get("gap_at", 4.2)) if vessel.get("dark") else 0.0
    f6_gap = min(1.0, gap_hours / 6.0)

    # Composite weighted score (Weights: 0.30, 0.25, 0.15, 0.10, 0.10, 0.10)
    composite_raw = (
        (0.30 * f1_distance) +
        (0.25 * f2_time) +
        (0.15 * f3_type) +
        (0.10 * f4_speed) +
        (0.10 * f5_drift) +
        (0.10 * f6_gap)
    )

    score_pct = round(min(0.99, max(0.10, composite_raw)), 2)
    pre_port_risk = calculate_pre_port_risk_index(vessel)
    anomalies = check_geofence_anomalies(vessel)

    # Attribution rationale synthesis
    reasons = []
    if vessel.get("dark"):
        reasons.append(f"AIS blackout ({gap_hours:.1f}h duration)")
    if observed_speed < 5.0 and v_type in ("Tanker", "Cargo"):
        reasons.append(f"discharge velocity reduction ({observed_speed:.1f} kn)")
    if min_dist_km < 5.0:
        reasons.append(f"direct track intercept ({min_dist_km:.1f} km from spill centroid)")
    elif min_dist_km < 25.0:
        reasons.append(f"course vector intersects drift corridor ({min_dist_km:.1f} km)")
    else:
        reasons.append(f"within {search_radius_km:.0f} km search perimeter")

    reason_str = ", ".join(reasons).capitalize()

    return {
        "vessel_mmsi": vessel["mmsi"],
        "suspicion_score": score_pct,
        "distance_km": round(min_dist_km, 1),
        "time_delta_min": time_delta_min,
        "reasoning": reason_str,
        "factors": {
            "f1_distance": round(f1_distance, 2),
            "f2_time": round(f2_time, 2),
            "f3_type": round(f3_type, 2),
            "f4_speed": round(f4_speed, 2),
            "f5_drift": round(f5_drift, 2),
            "f6_gap": round(f6_gap, 2),
        },
        "pre_port_risk_index": pre_port_risk,
        "geofence_alerts": anomalies,
    }


def rank_candidates(
    vessels: List[VesselLike],
    spill_centroid_lat: float,
    spill_centroid_lon: float,
    spill_detected_at: Optional[datetime] = None,
    drift_heading_deg: float = 135.0,
    search_radius_km: float = 60.0,
    lookback_hours: float = 12.0,
    top_n: int = 10,
) -> List[Dict[str, Any]]:
    """Ranks all candidate vessels according to the multi-factor mathematical formula."""
    scored = []
    for v in vessels:
        res = score_vessel(
            vessel=v,
            spill_centroid_lat=spill_centroid_lat,
            spill_centroid_lon=spill_centroid_lon,
            spill_detected_at=spill_detected_at,
            drift_heading_deg=drift_heading_deg,
            search_radius_km=search_radius_km,
            lookback_hours=lookback_hours,
        )
        scored.append(res)
    scored.sort(key=lambda x: x["suspicion_score"], reverse=True)
    return scored[:top_n]
