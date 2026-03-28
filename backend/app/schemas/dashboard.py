from __future__ import annotations

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_hosts: int
    hosts_up: int
    hosts_down: int
    total_checks: int
    checks_ok: int
    checks_warning: int
    checks_critical: int
    checks_unknown: int
    active_alerts: int
    critical_alerts: int
    warning_alerts: int
