"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AlertPublic } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/utils";

type Tab = "active" | "resolved" | "all";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "all") {
        const [active, resolved] = await Promise.all([
          api.alerts.list({ active: true }),
          api.alerts.list({ active: false }),
        ]);
        setAlerts([...active, ...resolved]);
      } else {
        const data = await api.alerts.list({ active: tab === "active" });
        setAlerts(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAcknowledge(id: string) {
    await api.alerts.acknowledge(id);
    load();
  }

  async function handleResolve(id: string) {
    await api.alerts.resolve(id);
    load();
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "resolved", label: "Resolved" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Alerts</h2>

      <div className="flex gap-1">
        {tabs.map((t) => (
          <Button
            key={t.value}
            variant={tab === t.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">
            {tab === "active" ? "No active alerts." : "No alerts found."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={
                !alert.resolved_at && alert.status === "critical"
                  ? "border-l-4 border-l-[hsl(var(--status-critical))]"
                  : !alert.resolved_at && alert.status === "warning"
                  ? "border-l-4 border-l-[hsl(var(--status-warning))]"
                  : ""
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
                    <div className="mt-1 flex gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                      <span>Started {timeAgo(alert.started_at)}</span>
                      {alert.resolved_at && <span>Resolved {timeAgo(alert.resolved_at)}</span>}
                      {alert.acknowledged_at && <span>Acknowledged</span>}
                    </div>
                  </div>
                </div>
                {!alert.resolved_at && (
                  <div className="flex gap-2">
                    {!alert.acknowledged_at && (
                      <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert.id)}>
                        Ack
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleResolve(alert.id)}>
                      Resolve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
