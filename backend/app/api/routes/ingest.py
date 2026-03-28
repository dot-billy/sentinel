from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_api_key_auth
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.schemas.ingest import IngestPayload, IngestResponse
from app.services.ingest import process_ingest

router = APIRouter(prefix="/v1", tags=["ingest"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    payload: IngestPayload,
    api_key: ApiKey = Depends(get_api_key_auth),
    db: AsyncSession = Depends(get_db),
) -> IngestResponse:
    return await process_ingest(db, payload, api_key)
