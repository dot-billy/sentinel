from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.check_result import CheckResult
    from app.models.host import Host


class Check(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "checks"

    host_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="unknown")
    last_result_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    host: Mapped[Host] = relationship(back_populates="checks")
    results: Mapped[list[CheckResult]] = relationship(back_populates="check", cascade="all, delete-orphan")
    alerts: Mapped[list[Alert]] = relationship(back_populates="check", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("host_id", "slug", name="uq_check_host_slug"),)
