from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.api_key import ApiKey
from app.models.check import Check
from app.models.check_result import CheckResult
from app.models.host import Host
from app.schemas.ingest import IngestPayload, IngestResponse
from app.services.slug import slugify


async def process_ingest(
    db: AsyncSession,
    payload: IngestPayload,
    api_key: ApiKey,
) -> IngestResponse:
    now = datetime.now(UTC)

    # 1. Get or create host
    host_slug = slugify(payload.host)
    result = await db.execute(select(Host).where(Host.slug == host_slug))
    host = result.scalar_one_or_none()
    if host is None:
        host = Host(name=payload.host, slug=host_slug)
        db.add(host)
        await db.flush()

    # Validate host-scoped key
    if api_key.host_id is not None and api_key.host_id != host.id:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="API key not authorized for this host")

    # 2. Get or create check
    check_slug = slugify(payload.check)
    result = await db.execute(
        select(Check).where(Check.host_id == host.id, Check.slug == check_slug)
    )
    check = result.scalar_one_or_none()
    if check is None:
        check = Check(host_id=host.id, name=payload.check, slug=check_slug, status="unknown")
        db.add(check)
        await db.flush()

    # 3. Store result
    check_result = CheckResult(
        check_id=check.id,
        status=payload.status,
        message=payload.message,
        metrics=payload.metrics,
    )
    db.add(check_result)

    # 4. Alert evaluation
    old_status = check.status
    new_status = payload.status

    if old_status in ("ok", "unknown") and new_status in ("warning", "critical"):
        # New alert
        alert = Alert(check_id=check.id, status=new_status, message=payload.message)
        db.add(alert)
    elif old_status in ("warning", "critical") and new_status == "ok":
        # Resolve active alerts
        active_alerts = await db.execute(
            select(Alert).where(Alert.check_id == check.id, Alert.resolved_at.is_(None))
        )
        for alert in active_alerts.scalars():
            alert.resolved_at = now
    elif old_status != new_status and new_status in ("warning", "critical"):
        # Escalation/de-escalation: resolve old, create new
        active_alerts = await db.execute(
            select(Alert).where(Alert.check_id == check.id, Alert.resolved_at.is_(None))
        )
        for alert in active_alerts.scalars():
            alert.resolved_at = now
        new_alert = Alert(check_id=check.id, status=new_status, message=payload.message)
        db.add(new_alert)

    # 5. Update check and host
    check.status = new_status
    check.last_result_at = now
    host.last_seen = now

    await db.commit()
    await db.refresh(check_result)

    return IngestResponse(
        host_id=host.id,
        check_id=check.id,
        result_id=check_result.id,
    )
