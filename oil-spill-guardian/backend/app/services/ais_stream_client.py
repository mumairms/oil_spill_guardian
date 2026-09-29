"""AISStream.io WebSocket integration service.

Connects to wss://stream.aisstream.io/v0/stream to receive real-time AIS vessel position reports
within a geographic bounding box.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional
import websockets

from ..config import AISSTREAM_API_KEY, AISSTREAM_WS_URL

logger = logging.getLogger(__name__)


async def stream_ais_positions(
    bounding_box: List[List[float]],
    api_key: Optional[str] = None,
    max_messages: int = 20,
    timeout_seconds: float = 10.0,
) -> AsyncGenerator[Dict, None]:
    """Connect to AISStream.io WebSocket and yield parsed vessel position reports.

    Args:
        bounding_box: [[[lat_min, lon_min], [lat_max, lon_max]]] e.g. [[[18.5, 72.5], [19.5, 73.5]]]
        api_key: AISStream.io API key (or falls back to AISSTREAM_API_KEY in env)
        max_messages: Maximum messages to stream before completing
        timeout_seconds: Maximum seconds to wait
    """
    key = api_key or AISSTREAM_API_KEY
    if not key:
        logger.warning("No AISStream API key provided. Using fallback simulated AIS positions.")
        return

    subscription = {
        "APIKey": key,
        "BoundingBoxes": bounding_box,
        "FilterMessageTypes": ["PositionReport", "StandardClassBPositionReport"],
    }

    try:
        async with websockets.connect(AISSTREAM_WS_URL, close_timeout=5) as ws:
            await ws.send(json.dumps(subscription))
            count = 0
            start_time = asyncio.get_event_loop().time()

            while count < max_messages:
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > timeout_seconds:
                    break

                try:
                    raw_msg = await asyncio.wait_for(ws.recv(), timeout=max(1.0, timeout_seconds - elapsed))
                    data = json.loads(raw_msg)
                    msg_type = data.get("MessageType")
                    meta = data.get("MetaData", {})
                    msg_body = data.get("Message", {}).get(msg_type, {})

                    if msg_body:
                        lat = msg_body.get("Latitude") or meta.get("latitude")
                        lon = msg_body.get("Longitude") or meta.get("longitude")
                        mmsi = str(meta.get("MMSI") or msg_body.get("UserID", ""))
                        speed = msg_body.get("Sog", 0.0)
                        course = msg_body.get("Cog", 0.0)

                        if lat and lon and mmsi:
                            count += 1
                            yield {
                                "mmsi": mmsi,
                                "name": meta.get("ShipName", "").strip() or None,
                                "lat": round(float(lat), 5),
                                "lon": round(float(lon), 5),
                                "speed_knots": round(float(speed), 1),
                                "course_deg": round(float(course), 1),
                                "timestamp": datetime.now(timezone.utc),
                                "raw_type": msg_type,
                            }
                except asyncio.TimeoutError:
                    break
    except Exception as e:
        logger.error(f"AISStream.io connection error: {e}")
