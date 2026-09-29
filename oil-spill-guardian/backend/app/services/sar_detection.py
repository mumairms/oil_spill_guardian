"""Oil-spill segmentation from Sentinel-1 SAR imagery.

Real pipeline (per the team's problem statement):
  1. Pull a Sentinel-1 GRD/SLC tile for the area of interest (ESA Copernicus).
  2. Preprocess: calibration, speckle filtering, land masking.
  3. Run a U-Net (or similar encoder-decoder) over the tile to produce a
     per-pixel oil-slick probability mask.
  4. Threshold + vectorize the mask into polygon(s), filter out "look-alike"
     false positives (low wind zones, algal blooms, rain cells).
  5. Return polygons as GeoJSON with a confidence score.

# TODO: replace stub
This function currently returns a single fixed fake polygon regardless of
input, so the rest of the system (API, DB, dashboard) has something real to
work against. Swap the body for actual U-Net inference (e.g. load a trained
checkpoint with torch/tensorflow, tile the image, run inference, vectorize
with rasterio/shapely) and keep the return shape identical.
"""

from datetime import datetime, timezone
from typing import TypedDict


class SpillDetection(TypedDict):
    polygon_geojson: dict
    centroid_lat: float
    centroid_lon: float
    area_km2: float
    confidence: float


def detect_spill(image_path: str, captured_at: datetime) -> SpillDetection | None:
    """Run spill segmentation on a SAR image. Returns None if no spill-like
    region is found above the confidence threshold."""

    # TODO: replace stub — this is where U-Net inference goes.
    fake_polygon = {
        "type": "Polygon",
        "coordinates": [[
            [72.76, 19.01], [72.80, 19.01],
            [72.80, 19.05], [72.76, 19.05],
            [72.76, 19.01],
        ]],
    }
    return {
        "polygon_geojson": fake_polygon,
        "centroid_lat": 19.03,
        "centroid_lon": 72.78,
        "area_km2": 12.4,
        "confidence": 0.87,
    }
