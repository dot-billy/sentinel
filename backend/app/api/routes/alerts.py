from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.alert import Alert
from app.models.check import Check
from app.schemas.alerts import AlertResponse

router = APIRouter(prefix="/v1/alerts", tags=["alerts"])

STATUS_SEVERITY = {"critical": 0, "warning": 1, "unknown": 2, "ok": 3}


def _build_alert_response(alert: Alert) -> AlertResponse:
    return AlertResponse(
        id=alert.id,
        check_id=alert.check_id,
        host_name=alert.check.host.name,
        check_name=alert.check.name,
        status=alert.status,
        message=alert.message,
        started_at=alert.started_at,
        resolved_at=alert.resolved_at,
        acknowledged_at=alert.acknowledged_at,
    )


def _alert_query():
    return select(Alert).options(selectinload(Alert.check).selectinload(Check.host))


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    active: bool = Query(True),
) -> list[AlertResponse]:
    query = _alert_query()

    if active:
        query = query.where(Alert.resolved_at.is_(None))

    query = query.order_by(Alert.started_at.desc())
    result = await db.execute(query)
    alerts = result.scalars().all()

    response = [_build_alert_response(a) for a in alerts]
    response.sort(key=lambda x: (STATUS_SEVERITY.get(x.status, 99), x.started_at))
    return response


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> AlertResponse:
    result = await db.execute(_alert_query().where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.acknowledged_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(alert)
    return _build_alert_response(alert)


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> AlertResponse:
    result = await db.execute(_alert_query().where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.resolved_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(alert)
    return _build_alert_response(alert)
