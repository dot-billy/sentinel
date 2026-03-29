"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/utils";
import { Plus, Shield, ShieldOff, UserX, UserCheck, KeyRound } from "lucide-react";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState("");

  // Password change state
  const [changingPasswordFor, setChangingPasswordFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newEmail.trim() || !newPassword) return;
    setCreating(true);
    try {
      await api.users.create({ email: newEmail.trim(), password: newPassword, is_admin: newIsAdmin });
      setNewEmail("");
      setNewPassword("");
      setNewIsAdmin(false);
      setShowCreate(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u: AdminUser) {
    if (u.id === currentUser?.id) return;
    await api.users.update(u.id, { is_active: !u.is_active });
    loadUsers();
  }

  async function toggleAdmin(u: AdminUser) {
    if (u.id === currentUser?.id) return;
    await api.users.update(u.id, { is_admin: !u.is_admin });
    loadUsers();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!changingPasswordFor || newPw.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    try {
      await api.users.changePassword(changingPasswordFor, { new_password: newPw });
      setChangingPasswordFor(null);
      setNewPw("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    }
  }

  const isSelf = (u: AdminUser) => u.id === currentUser?.id;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="is_admin"
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="h-4 w-4 rounded border-[hsl(var(--border))]"
                />
                <Label htmlFor="is_admin">Admin privileges</Label>
              </div>
              {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Spinner /> : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <Spinner className="mx-auto h-6 w-6" />
          ) : users.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{u.email}</span>
                      {isSelf(u) && (
                        <Badge variant="outline" className="text-xs">you</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.is_admin ? (
                        <Badge variant="default" className="text-xs">Admin</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">User</Badge>
                      )}
                      {u.is_active ? (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-transparent">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600 border-transparent">Inactive</Badge>
                      )}
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        Created {timeAgo(u.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={u.is_admin ? "Remove admin" : "Make admin"}
                      onClick={() => toggleAdmin(u)}
                      disabled={isSelf(u)}
                    >
                      {u.is_admin ? (
                        <ShieldOff className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={u.is_active ? "Deactivate" : "Activate"}
                      onClick={() => toggleActive(u)}
                      disabled={isSelf(u)}
                    >
                      {u.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Change password"
                      onClick={() => {
                        setChangingPasswordFor(changingPasswordFor === u.id ? null : u.id);
                        setNewPw("");
                        setPwError("");
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Password change inline form */}
              {changingPasswordFor && (
                <div className="rounded-md border border-[hsl(var(--border))] p-4">
                  <form onSubmit={handleChangePassword} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">
                        New password for {users.find((u) => u.id === changingPasswordFor)?.email}
                      </Label>
                      <Input
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        minLength={8}
                      />
                    </div>
                    <Button type="submit" size="sm">Save</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setChangingPasswordFor(null); setNewPw(""); setPwError(""); }}
                    >
                      Cancel
                    </Button>
                  </form>
                  {pwError && <p className="mt-1 text-sm text-[hsl(var(--destructive))]">{pwError}</p>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
