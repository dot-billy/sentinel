from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class CheckResponse(BaseModel):
    id: uuid.UUID
    host_id: uuid.UUID
    host_name: str
    name: str
    slug: str
    status: str
    last_result_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CheckResultResponse(BaseModel):
    id: uuid.UUID
    check_id: uuid.UUID
    status: str
    message: str | None
    metrics: dict | None
    received_at: datetime

    model_config = {"from_attributes": True}
