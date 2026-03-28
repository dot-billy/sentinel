from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.check import Check
from app.models.check_result import CheckResult
from app.schemas.checks import CheckResponse, CheckResultResponse

router = APIRouter(prefix="/v1/checks", tags=["checks"])

STATUS_SEVERITY = {"critical": 0, "warning": 1, "unknown": 2, "ok": 3}


@router.get("", response_model=list[CheckResponse])
async def list_checks(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    check_status: str | None = Query(None, alias="status"),
    host_id: uuid.UUID | None = None,
) -> list[CheckResponse]:
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=settings.stale_threshold_minutes)
    query = select(Check).options(selectinload(Check.host))

    if host_id:
        query = query.where(Check.host_id == host_id)

    result = await db.execute(query)
    checks = result.scalars().all()

    response = []
    for c in checks:
        effective = c.status
        if c.last_result_at and c.last_result_at < stale_cutoff:
            effective = "unknown"

        if check_status and effective != check_status:
            continue

        response.append(
            CheckResponse(
                id=c.id,
                host_id=c.host_id,
                host_name=c.host.name,
                name=c.name,
                slug=c.slug,
                status=effective,
                last_result_at=c.last_result_at,
                created_at=c.created_at,
            )
        )

    response.sort(key=lambda x: STATUS_SEVERITY.get(x.status, 99))
    return response


@router.get("/{check_id}/results", response_model=list[CheckResultResponse])
async def list_check_results(
    check_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[CheckResultResponse]:
    check = await db.execute(select(Check).where(Check.id == check_id))
    if not check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check not found")

    result = await db.execute(
        select(CheckResult)
        .where(CheckResult.check_id == check_id)
        .order_by(CheckResult.received_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [CheckResultResponse.model_validate(r) for r in result.scalars()]
