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
    """Insert realistic spills + vessels so the dashboard has rich data out of the box."""
    from . import models

    db = SessionLocal()
    try:
        # Check if already seeded with new data
        if db.query(models.Spill).count() >= 3:
            return

        # If old data exists, clear and re-seed
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
                lat=19.06,
                lon=72.88,
                speed_knots=2.1,
                course_deg=210,
                track_geojson=[
                    [19.28, 72.60], [19.24, 72.66], [19.19, 72.71], [19.15, 72.75],
                    [19.11, 72.79], [19.08, 72.83], [19.06, 72.88]
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
                lat=19.14,
                lon=73.20,
                speed_knots=11.4,
                course_deg=95,
                track_geojson=[
                    [19.20, 72.30], [19.19, 72.45], [19.18, 72.60], [19.17, 72.75],
                    [19.16, 72.90], [19.15, 73.05], [19.14, 73.20]
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
                lat=19.10,
                lon=72.20,
                speed_knots=12.8,
                course_deg=270,
                track_geojson=[
                    [19.05, 72.95], [19.06, 72.80], [19.07, 72.65], [19.08, 72.50],
                    [19.09, 72.35], [19.10, 72.20]
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
                lat=19.20,
                lon=72.75,
                speed_knots=4.2,
                course_deg=180,
                track_geojson=[
                    [19.40, 72.70], [19.36, 72.71], [19.32, 72.72], [19.28, 72.73],
                    [19.24, 72.74], [19.20, 72.75]
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
                lat=19.00,
                lon=73.20,
                speed_knots=13.1,
                course_deg=45,
                track_geojson=[
                    [18.70, 72.90], [18.76, 72.96], [18.82, 73.02], [18.88, 73.08],
                    [18.94, 73.14], [19.00, 73.20]
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
                centroid_lat=19.08,
                centroid_lon=72.84,
                polygon_geojson={
                    "type": "Polygon",
                    "coordinates": [[
                        [72.72, 19.08], [72.76, 19.12], [72.83, 19.15], [72.90, 19.14],
                        [72.95, 19.10], [72.96, 19.04], [72.92, 18.99], [72.84, 18.97],
                        [72.77, 18.99], [72.72, 19.03], [72.72, 19.08]
                    ]]
                },
                drift_geojson=[
                    [19.04, 72.80], [19.02, 72.92], [18.98, 73.04], [18.92, 73.15], [18.85, 73.24]
                ],
                area_km2=18.7,
                confidence=0.94,
                severity="critical",
                source_image="S1A_IW_GRDH_20260923T1332",
                status="active",
            ),
            models.Spill(
                spill_code="SPL-2026-0923-002",
                detected_at=now - timedelta(hours=8),
                centroid_lat=19.32,
                centroid_lon=72.61,
                polygon_geojson={
                    "type": "Polygon",
                    "coordinates": [[
                        [72.55, 19.32], [72.58, 19.36], [72.63, 19.38], [72.67, 19.35],
                        [72.66, 19.30], [72.61, 19.27], [72.56, 19.28], [72.55, 19.32]
                    ]]
                },
                drift_geojson=[
                    [19.32, 72.60], [19.30, 72.70], [19.26, 72.80], [19.20, 72.88]
                ],
                area_km2=6.3,
                confidence=0.81,
                severity="high",
                source_image="S1B_IW_GRDH_20260923T0418",
                status="active",
            ),
            models.Spill(
                spill_code="SPL-2026-0922-007",
                detected_at=now - timedelta(days=1),
                centroid_lat=18.78,
                centroid_lon=73.02,
                polygon_geojson={
                    "type": "Polygon",
                    "coordinates": [[
                        [72.95, 18.78], [72.99, 18.82], [73.05, 18.84], [73.09, 18.80],
                        [73.08, 18.75], [73.02, 18.72], [72.96, 18.73], [72.95, 18.78]
                    ]]
                },
                drift_geojson=[
                    [18.78, 73.00], [18.74, 73.10], [18.68, 73.18], [18.60, 73.24]
                ],
                area_km2=11.2,
                confidence=0.88,
                severity="medium",
                source_image="S1A_IW_GRDH_20260922T1330",
                status="resolved",
            ),
        ]
        db.add_all(spills)
        db.commit()
    finally:
        db.close()
