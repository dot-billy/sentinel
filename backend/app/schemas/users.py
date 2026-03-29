from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(min_length=8, max_length=128)
    is_admin: bool = False


class UserUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class ChangePassword(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
