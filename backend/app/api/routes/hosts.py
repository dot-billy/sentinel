from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.check import Check
from app.models.check_result import CheckResult
from app.models.host import Host
from app.schemas.hosts import CheckSummary, HostDetail, HostResponse, HostUpdate

router = APIRouter(prefix="/v1/hosts", tags=["hosts"])


def _effective_status(check_status: str, last_result_at: datetime | None, stale_cutoff: datetime) -> str:
    if last_result_at and last_result_at < stale_cutoff:
        return "unknown"
    return check_status


def _derive_host_status(checks: list[Check], stale_cutoff: datetime) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {"ok": 0, "warning": 0, "critical": 0, "unknown": 0}
    for c in checks:
        s = _effective_status(c.status, c.last_result_at, stale_cutoff)
        counts[s] = counts.get(s, 0) + 1

    if counts["critical"] > 0:
        return "critical", counts
    if counts["warning"] > 0:
        return "warning", counts
    if counts["unknown"] > 0 and counts["ok"] == 0:
        return "unknown", counts
    if counts["ok"] > 0:
        return "ok", counts
    return "unknown", counts


@router.get("", response_model=list[HostResponse])
async def list_hosts(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[HostResponse]:
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=settings.stale_threshold_minutes)
    result = await db.execute(select(Host).options(selectinload(Host.checks)).order_by(Host.name))
    hosts = result.scalars().all()

    response = []
    for host in hosts:
        host_status, check_counts = _derive_host_status(host.checks, stale_cutoff)
        response.append(
            HostResponse(
                id=host.id,
                name=host.name,
                slug=host.slug,
                description=host.description,
                last_seen=host.last_seen,
                status=host_status,
                check_counts=check_counts,
                created_at=host.created_at,
            )
        )
    return response


@router.get("/{host_id}", response_model=HostDetail)
async def get_host(
    host_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> HostDetail:
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=settings.stale_threshold_minutes)
    result = await db.execute(
        select(Host).where(Host.id == host_id).options(selectinload(Host.checks))
    )
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host not found")

    host_status, check_counts = _derive_host_status(host.checks, stale_cutoff)

    # Get last message for each check
    check_summaries = []
    for c in sorted(host.checks, key=lambda x: x.name):
        last_result = await db.execute(
            select(CheckResult.message)
            .where(CheckResult.check_id == c.id)
            .order_by(CheckResult.received_at.desc())
            .limit(1)
        )
        last_msg = last_result.scalar_one_or_none()
        effective = _effective_status(c.status, c.last_result_at, stale_cutoff)
        check_summaries.append(
            CheckSummary(
                id=c.id,
                name=c.name,
                slug=c.slug,
                status=effective,
                last_result_at=c.last_result_at,
                last_message=last_msg,
                created_at=c.created_at,
            )
        )

    return HostDetail(
        id=host.id,
        name=host.name,
        slug=host.slug,
        description=host.description,
        last_seen=host.last_seen,
        status=host_status,
        check_counts=check_counts,
        created_at=host.created_at,
        checks=check_summaries,
    )


@router.patch("/{host_id}", response_model=HostResponse)
async def update_host(
    host_id: uuid.UUID,
    body: HostUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> HostResponse:
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=settings.stale_threshold_minutes)
    result = await db.execute(
        select(Host).where(Host.id == host_id).options(selectinload(Host.checks))
    )
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host not found")

    if body.description is not None:
        host.description = body.description

    await db.commit()
    await db.refresh(host)

    host_status, check_counts = _derive_host_status(host.checks, stale_cutoff)
    return HostResponse(
        id=host.id,
        name=host.name,
        slug=host.slug,
        description=host.description,
        last_seen=host.last_seen,
        status=host_status,
        check_counts=check_counts,
        created_at=host.created_at,
    )


@router.delete("/{host_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_host(
    host_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Host).where(Host.id == host_id))
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host not found")

    await db.delete(host)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
