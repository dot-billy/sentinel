"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ApiKeyPublic, type ApiKeyCreated } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { copyToClipboard, timeAgo } from "@/lib/utils";
import { Copy, Key, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await api.apiKeys.list();
      setKeys(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const key = await api.apiKeys.create({ name: newKeyName.trim() });
      setCreatedKey(key);
      setNewKeyName("");
      loadKeys();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this API key?")) return;
    await api.apiKeys.delete(id);
    loadKeys();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="Key name (e.g. web-servers)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={creating || !newKeyName.trim()}>
              {creating ? <Spinner /> : "Create"}
            </Button>
          </form>

          {createdKey && (
            <div className="rounded-md border border-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning))/0.1] p-3">
              <p className="mb-2 text-sm font-medium">
                Copy this key now. It won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-[hsl(var(--muted))] px-2 py-1 text-sm font-mono break-all">
                  {createdKey.key}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdKey.key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <Spinner className="mx-auto h-4 w-4" />
          ) : keys.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <div>
                      <p className="text-sm font-medium">{k.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {k.key_prefix}... &middot; {k.host_name ? `Scoped to ${k.host_name}` : "Global"} &middot;{" "}
                        {k.is_active ? "Active" : "Inactive"} &middot; Created {timeAgo(k.created_at)}
                      </p>
                    </div>
                  </div>
                  {k.is_active && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(k.id)}>
                      <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
