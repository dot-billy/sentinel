"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type HostDetail, type CheckResultPublic } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/utils";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function HostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [host, setHost] = useState<HostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CheckResultPublic[]>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.hosts.get(id);
      setHost(data);
    } catch {
      router.replace("/dashboard/hosts");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCheck(checkId: string) {
    if (expandedCheck === checkId) {
      setExpandedCheck(null);
      return;
    }
    setExpandedCheck(checkId);
    if (!results[checkId]) {
      const data = await api.checks.results(checkId, { limit: 20 });
      setResults((prev) => ({ ...prev, [checkId]: data }));
    }
  }

  async function handleDelete() {
    if (!host || !confirm(`Delete host "${host.name}" and all its data?`)) return;
    await api.hosts.delete(host.id);
    router.replace("/dashboard/hosts");
  }

  if (loading || !host) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{host.name}</h2>
            <StatusBadge status={host.status} />
          </div>
          {host.last_seen && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Last seen {timeAgo(host.last_seen)}</p>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1 h-3 w-3" /> Delete
        </Button>
      </div>

      {host.description && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{host.description}</p>
      )}

      {/* Checks */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Checks ({host.checks.length})</h3>
        {host.checks.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-[hsl(var(--muted-foreground))]">
              No checks yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {host.checks.map((check) => (
              <Card key={check.id}>
                <button
                  onClick={() => toggleCheck(check.id)}
                  className="w-full text-left"
                >
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={check.status} />
                      <div>
                        <p className="text-sm font-medium">{check.name}</p>
                        {check.last_message && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{check.last_message}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {check.last_result_at ? timeAgo(check.last_result_at) : "never"}
                    </span>
                  </CardContent>
                </button>

                {/* Status timeline */}
                {expandedCheck === check.id && (
                  <CardContent className="border-t border-[hsl(var(--border))] pt-3">
                    {results[check.id] ? (
                      <div className="space-y-3">
                        <div className="flex gap-1">
                          {results[check.id].map((r) => (
                            <div
                              key={r.id}
                              title={`${r.status} - ${r.received_at}`}
                              className={`h-4 w-4 rounded-sm ${
                                r.status === "ok"
                                  ? "bg-[hsl(var(--status-ok))]"
                                  : r.status === "warning"
                                  ? "bg-[hsl(var(--status-warning))]"
                                  : r.status === "critical"
                                  ? "bg-[hsl(var(--status-critical))]"
                                  : "bg-[hsl(var(--status-unknown))]"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="space-y-1">
                          {results[check.id].slice(0, 5).map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-xs">
                              <StatusBadge status={r.status} />
                              <span className="text-[hsl(var(--muted-foreground))]">{timeAgo(r.received_at)}</span>
                              {r.message && <span className="truncate">{r.message}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Spinner className="mx-auto h-4 w-4" />
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
