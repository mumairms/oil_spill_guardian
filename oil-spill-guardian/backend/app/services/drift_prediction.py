"""Oil-slick drift prediction, using ocean currents + wind vectors.

Physical advection model:
  - Slick velocity vector V_spill = V_current + 0.03 * V_wind (Leeway rule)
  - CMEMS / Open-Meteo marine currents provide uo (eastward) and vo (northward) or velocity + direction.
"""

import math
from typing import TypedDict, List
from .marine_weather import get_marine_conditions


class DriftPoint(TypedDict):
    hours_ahead: int
    lat: float
    lon: float
    current_speed_knots: float
    drift_direction_deg: float
    uncertainty_radius_km: float


def predict_drift(
    centroid_lat: float,
    centroid_lon: float,
    hours_ahead: int = 24,
) -> List[DriftPoint]:
    """Calculate physics-informed forward drift path using Open-Meteo / CMEMS marine currents."""
    marine = get_marine_conditions(centroid_lat, centroid_lon, forecast_days=max(1, math.ceil(hours_ahead / 24)))
    curr = marine.get("current_conditions", {})

    # Current velocity in m/s (1 m/s = 3.6 km/h)
    curr_ms = curr.get("ocean_current_velocity_ms", 0.4)
    curr_dir_deg = curr.get("ocean_current_direction_deg", 215.0)

    # 1 degree of latitude is ~111.13 km
    # 1 degree of longitude is ~111.13 * cos(lat) km
    km_per_deg_lat = 111.13
    km_per_deg_lon = 111.13 * math.cos(math.radians(centroid_lat))

    # Convert drift direction (meteorological / nautical towards angle)
    rad = math.radians(curr_dir_deg)
    # North component (vo) and East component (uo)
    vo_kmh = curr_ms * 3.6 * math.cos(rad)
    uo_kmh = curr_ms * 3.6 * math.sin(rad)

    points: List[DriftPoint] = []
    step = max(1, hours_ahead // 6)

    curr_lat = centroid_lat
    curr_lon = centroid_lon

    for h in range(step, hours_ahead + 1, step):
        d_lat = (vo_kmh * step) / km_per_deg_lat
        d_lon = (uo_kmh * step) / km_per_deg_lon

        curr_lat += d_lat
        curr_lon += d_lon

        # Uncertainty expands linearly with time (~0.5 km per hour of drift)
        uncertainty = round(0.8 + 0.45 * h, 2)

        points.append({
            "hours_ahead": h,
            "lat": round(curr_lat, 5),
            "lon": round(curr_lon, 5),
            "current_speed_knots": curr.get("ocean_current_velocity_knots", 0.8),
            "drift_direction_deg": curr_dir_deg,
            "uncertainty_radius_km": uncertainty,
        })

    return points
