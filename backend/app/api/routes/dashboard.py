from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.alert import Alert
from app.models.check import Check
from app.models.host import Host
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def summary(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> DashboardSummary:
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=settings.stale_threshold_minutes)

    # Host counts
    total_hosts = (await db.execute(select(func.count(Host.id)))).scalar() or 0

    # Check counts with stale detection
    checks_result = await db.execute(select(Check.status, Check.last_result_at))
    checks_ok = checks_warning = checks_critical = checks_unknown = 0
    hosts_with_issues: set = set()

    for row in checks_result:
        effective_status = row.status
        if row.last_result_at and row.last_result_at < stale_cutoff:
            effective_status = "unknown"

        if effective_status == "ok":
            checks_ok += 1
        elif effective_status == "warning":
            checks_warning += 1
            hosts_with_issues.add(row)
        elif effective_status == "critical":
            checks_critical += 1
            hosts_with_issues.add(row)
        else:
            checks_unknown += 1

    total_checks = checks_ok + checks_warning + checks_critical + checks_unknown

    # Active alerts
    active_alerts_result = await db.execute(
        select(Alert.status).where(Alert.resolved_at.is_(None))
    )
    active_statuses = [r[0] for r in active_alerts_result]
    active_alerts = len(active_statuses)
    critical_alerts = sum(1 for s in active_statuses if s == "critical")
    warning_alerts = sum(1 for s in active_statuses if s == "warning")

    # Hosts down = hosts with at least one critical check
    hosts_with_critical = (
        await db.execute(
            select(func.count(func.distinct(Check.host_id))).where(Check.status == "critical")
        )
    ).scalar() or 0

    return DashboardSummary(
        total_hosts=total_hosts,
        hosts_up=total_hosts - hosts_with_critical,
        hosts_down=hosts_with_critical,
        total_checks=total_checks,
        checks_ok=checks_ok,
        checks_warning=checks_warning,
        checks_critical=checks_critical,
        checks_unknown=checks_unknown,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        warning_alerts=warning_alerts,
    )
