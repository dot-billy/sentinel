from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sentinel API",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    origins = [settings.frontend_origin.rstrip("/")]
    if settings.sentinel_env == "dev":
        origins.extend(["http://localhost:3020", "http://127.0.0.1:3020"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(set(origins)),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"ok": True}

    app.include_router(api_router)

    return app


app = create_app()
