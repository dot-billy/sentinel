from fastapi import APIRouter

from app.api.routes import alerts, api_keys, auth, checks, dashboard, hosts, ingest, users

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(ingest.router)
api_router.include_router(dashboard.router)
api_router.include_router(hosts.router)
api_router.include_router(checks.router)
api_router.include_router(alerts.router)
api_router.include_router(api_keys.router)
api_router.include_router(users.router)
