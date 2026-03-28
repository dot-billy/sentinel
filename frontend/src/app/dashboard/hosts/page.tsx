"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type HostPublic } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/utils";
import { Server } from "lucide-react";

export default function HostsPage() {
  const [hosts, setHosts] = useState<HostPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.hosts.list();
      setHosts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = hosts.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Hosts</h2>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{hosts.length} total</span>
      </div>

      <Input
        placeholder="Search hosts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">
            {hosts.length === 0
              ? "No hosts yet. Send a check result to get started."
              : "No hosts match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((host) => (
            <Link key={host.id} href={`/dashboard/hosts/${host.id}`}>
              <Card className="cursor-pointer transition-colors hover:border-[hsl(var(--ring))]">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="font-medium">{host.name}</span>
                    </div>
                    <StatusBadge status={host.status} />
                  </div>
                  <div className="mt-3 flex gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    {Object.entries(host.check_counts).map(([status, count]) =>
                      count > 0 ? (
                        <span key={status}>
                          {count} {status}
                        </span>
                      ) : null
                    )}
                  </div>
                  {host.last_seen && (
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      Last seen {timeAgo(host.last_seen)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
