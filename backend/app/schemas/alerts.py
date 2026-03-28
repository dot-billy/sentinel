from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: uuid.UUID
    check_id: uuid.UUID
    host_name: str
    check_name: str
    status: str
    message: str | None
    started_at: datetime
    resolved_at: datetime | None
    acknowledged_at: datetime | None

    model_config = {"from_attributes": True}
