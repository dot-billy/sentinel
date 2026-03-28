"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type DashboardSummary, type AlertPublic } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/utils";
import { Server, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertPublic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        api.dashboard.summary(),
        api.alerts.list({ active: true }),
      ]);
      setSummary(s);
      setAlerts(a);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Hosts", value: summary.total_hosts, icon: Server, color: "text-[hsl(var(--foreground))]" },
    { label: "Checks OK", value: summary.checks_ok, icon: CheckCircle, color: "text-[hsl(var(--status-ok))]" },
    { label: "Warnings", value: summary.checks_warning, icon: AlertTriangle, color: "text-[hsl(var(--status-warning))]" },
    { label: "Critical", value: summary.checks_critical, icon: XCircle, color: "text-[hsl(var(--status-critical))]" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Overview</h2>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active alerts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Alerts ({alerts.length})</h3>
          <Link href="/dashboard/alerts">
            <Button variant="outline" size="sm">View all</Button>
          </Link>
        </div>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">
              No active alerts. All systems operational.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 10).map((alert) => (
              <Card
                key={alert.id}
                className={
                  alert.status === "critical"
                    ? "border-l-4 border-l-[hsl(var(--status-critical))]"
                    : "border-l-4 border-l-[hsl(var(--status-warning))]"
                }
              >
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={alert.status} />
                    <div>
                      <p className="text-sm font-medium">
                        {alert.host_name} / {alert.check_name}
                      </p>
                      {alert.message && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{alert.message}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {timeAgo(alert.started_at)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
