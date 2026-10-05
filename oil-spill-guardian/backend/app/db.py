from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create the postgis extension + all tables. Safe to call repeatedly."""
    if engine.dialect.name == "postgresql":
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
    from . import models  # noqa: F401 (ensures models are registered)

    Base.metadata.create_all(bind=engine)


def seed_demo_data():
    """Insert realistic open-ocean spills + vessels in the middle of the high-seas corridor."""
    from . import models

    db = SessionLocal()
    try:
        # Clear and re-seed with middle-of-ocean coordinates
        db.query(models.Alert).delete()
        db.query(models.Vessel).delete()
        db.query(models.Spill).delete()

        now = datetime.now(timezone.utc)

        vessels = [
            models.Vessel(
                mmsi="419001234",
                name="MV Ocean Pride",
                vessel_type="Tanker",
                flag="IN",
                dark=True,
                lat=15.46,
                lon=65.90,
                speed_knots=2.1,
                course_deg=135,
                track_geojson=[
                  [15.82, 65.35], [15.75, 65.48], [15.68, 65.60], [15.60, 65.72],
                  [15.52, 65.82], [15.48, 65.86], [15.46, 65.90],
                ],
                gap_at=4,
                last_seen=now - timedelta(minutes=12),
            ),
            models.Vessel(
                mmsi="636019876",
                name="MT Sea Falcon",
                vessel_type="Tanker",
                flag="LR",
                dark=False,
                lat=15.60,
                lon=66.80,
                speed_knots=11.4,
                course_deg=95,
                track_geojson=[
                  [15.72, 64.80], [15.70, 65.20], [15.68, 65.60], [15.65, 66.00],
                  [15.63, 66.30], [15.61, 66.60], [15.60, 66.80],
                ],
                gap_at=None,
                last_seen=now - timedelta(minutes=3),
            ),
            models.Vessel(
                mmsi="353136000",
                name="MV Coral Trader",
                vessel_type="Cargo",
                flag="PA",
                dark=False,
                lat=15.50,
                lon=64.40,
                speed_knots=12.8,
                course_deg=265,
                track_geojson=[
                  [15.35, 66.60], [15.38, 66.20], [15.42, 65.75], [15.45, 65.30],
                  [15.48, 64.85], [15.50, 64.40],
                ],
                gap_at=None,
                last_seen=now - timedelta(minutes=6),
            ),
            models.Vessel(
                mmsi="419876543",
                name="FV Sagar Kanya",
                vessel_type="Fishing",
                flag="IN",
                dark=False,
                lat=15.80,
                lon=65.40,
                speed_knots=4.2,
                course_deg=180,
                track_geojson=[
                  [16.25, 65.38], [16.12, 65.39], [16.00, 65.39], [15.90, 65.40],
                  [15.80, 65.40],
                ],
                gap_at=None,
                last_seen=now - timedelta(minutes=18),
            ),
            models.Vessel(
                mmsi="538005678",
                name="MT Gulf Spirit",
                vessel_type="Tanker",
                flag="MH",
                dark=False,
                lat=15.00,
                lon=66.60,
                speed_knots=13.1,
                course_deg=45,
                track_geojson=[
                  [14.30, 65.80], [14.45, 66.00], [14.60, 66.18], [14.75, 66.35],
                  [14.90, 66.50], [15.00, 66.60],
                ],
                gap_at=None,
                last_seen=now - timedelta(minutes=2),
            ),
        ]
        db.add_all(vessels)

        spills = [
            models.Spill(
                spill_code="SPL-2026-0923-001",
                detected_at=now - timedelta(hours=2),
                centroid_lat=15.48,
                centroid_lon=65.84,
                polygon_geojson={
                    "type": "Polygon",
                    "coordinates": [[
                        [65.72, 15.48], [65.76, 15.52], [65.83, 15.55], [65.90, 15.54],
                        [65.95, 15.50], [65.96, 15.44], [65.92, 15.39], [65.84, 15.37],
                        [65.77, 15.39], [65.72, 15.43], [65.72, 15.48],
                    ]],
                },
                drift_geojson=[
                    [15.48, 65.84], [15.38, 66.02], [15.25, 66.22], [15.10, 66.45], [14.90, 66.70],
                ],
                area_km2=24.5,
                confidence=0.96,
                severity="critical",
                source_image="S1A_IW_GRDH_20260923T1332",
                status="active",
            ),
            models.Spill(
                spill_code="SPL-2026-0923-002",
                detected_at=now - timedelta(hours=8),
                centroid_lat=16.20,
                centroid_lon=64.95,
                polygon_geojson={
                    "type": "Polygon",
                    "coordinates": [[
                        [64.88, 16.20], [64.92, 16.24], [64.97, 16.26], [65.02, 16.23],
                        [65.01, 16.18], [64.96, 16.15], [64.90, 16.16], [64.88, 16.20],
                    ]],
                },
                drift_geojson=[
                    [16.20, 64.95], [16.10, 65.15], [15.95, 65.40], [15.78, 65.65],
                ],
                area_km2=8.4,
                confidence=0.86,
                severity="high",
                source_image="S1B_IW_GRDH_20260923T0418",
                status="active",
            ),
            models.Spill(
                spill_code="SPL-2026-0922-007",
                detected_at=now - timedelta(days=1),
                centroid_lat=14.65,
                centroid_lon=66.40,
                polygon_geojson={
                    "type": "Polygon",
                    "coordinates": [[
                        [66.32, 14.65], [66.36, 14.69], [66.42, 14.71], [66.47, 14.67],
                        [66.46, 14.62], [66.40, 14.59], [66.34, 14.60], [66.32, 14.65],
                    ]],
                },
                drift_geojson=[
                    [14.65, 66.40], [14.55, 66.58], [14.42, 66.78], [14.28, 66.98],
                ],
                area_km2=14.1,
                confidence=0.91,
                severity="medium",
                source_image="S1A_IW_GRDH_20260922T1330",
                status="resolved",
            ),
        ]
        db.add_all(spills)
        db.commit()
    finally:
        db.close()
