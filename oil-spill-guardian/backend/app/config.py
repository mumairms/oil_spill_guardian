import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "sqlite:///./oilspill.db"
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Vessels closer than this many kilometres to a spill polygon, in the hours
# before it was detected, are treated as candidates in the correlation engine.
CORRELATION_RADIUS_KM = float(os.getenv("CORRELATION_RADIUS_KM", "15"))
CORRELATION_LOOKBACK_HOURS = int(os.getenv("CORRELATION_LOOKBACK_HOURS", "12"))

# External API Configurations
CDSE_ODATA_URL = os.getenv(
    "CDSE_ODATA_URL", "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
)
CDSE_STAC_URL = os.getenv(
    "CDSE_STAC_URL", "https://catalogue.dataspace.copernicus.eu/stac/search"
)
CDSE_TOKEN_URL = os.getenv(
    "CDSE_TOKEN_URL",
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
)
CDSE_CLIENT_ID = os.getenv("CDSE_CLIENT_ID", "")
CDSE_CLIENT_SECRET = os.getenv("CDSE_CLIENT_SECRET", "")

AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY", "")
AISSTREAM_WS_URL = os.getenv("AISSTREAM_WS_URL", "wss://stream.aisstream.io/v0/stream")

OPEN_METEO_MARINE_URL = os.getenv(
    "OPEN_METEO_MARINE_URL", "https://marine-api.open-meteo.com/v1/marine"
)
OPEN_METEO_WEATHER_URL = os.getenv(
    "OPEN_METEO_WEATHER_URL", "https://api.open-meteo.com/v1/forecast"
)
