from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class IngestPayload(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    check: str = Field(min_length=1, max_length=255)
    status: str = Field(pattern=r"^(ok|warning|critical|unknown)$")
    message: str | None = Field(default=None, max_length=2000)
    metrics: dict | None = None


class IngestResponse(BaseModel):
    ok: bool = True
    host_id: uuid.UUID
    check_id: uuid.UUID
    result_id: uuid.UUID
