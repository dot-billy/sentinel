from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class HostResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    last_seen: datetime | None
    status: str
    check_counts: dict[str, int]
    created_at: datetime

    model_config = {"from_attributes": True}


class HostDetail(HostResponse):
    checks: list[CheckSummary]


class CheckSummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    last_result_at: datetime | None
    last_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# Rebuild forward refs
HostDetail.model_rebuild()


class HostUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=2000)
