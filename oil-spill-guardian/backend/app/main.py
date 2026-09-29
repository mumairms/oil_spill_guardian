from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db, seed_demo_data
from .routers import vessels, spills, alerts, external

app = FastAPI(
    title="Oil Spill Guardian API",
    description="Maritime surveillance platform: Sentinel-1 SAR spill detection + "
                 "AISStream / pyais vessel correlation + Open-Meteo & CMEMS ocean current drift.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before deploying anywhere real
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vessels.router)
app.include_router(spills.router)
app.include_router(alerts.router)
app.include_router(external.router)


@app.on_event("startup")
def on_startup():
    init_db()
    seed_demo_data()


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}
