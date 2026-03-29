const BASE = "";

export class ApiError extends Error {
  constructor(public status: number, public body: Record<string, unknown>) {
    super((body.detail as string) ?? `API error ${status}`);
  }
}

const TOKEN_KEY = "sentinel-token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

// --- Types ---

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserPublic {
  id: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_hosts: number;
  hosts_up: number;
  hosts_down: number;
  total_checks: number;
  checks_ok: number;
  checks_warning: number;
  checks_critical: number;
  checks_unknown: number;
  active_alerts: number;
  critical_alerts: number;
  warning_alerts: number;
}

export interface HostPublic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  last_seen: string | null;
  status: string;
  check_counts: Record<string, number>;
  created_at: string;
}

export interface CheckSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  last_result_at: string | null;
  last_message: string | null;
  created_at: string;
}

export interface HostDetail extends HostPublic {
  checks: CheckSummary[];
}

export interface CheckPublic {
  id: string;
  host_id: string;
  host_name: string;
  name: string;
  slug: string;
  status: string;
  last_result_at: string | null;
  created_at: string;
}

export interface CheckResultPublic {
  id: string;
  check_id: string;
  status: string;
  message: string | null;
  metrics: Record<string, unknown> | null;
  received_at: string;
}

export interface AlertPublic {
  id: string;
  check_id: string;
  host_name: string;
  check_name: string;
  status: string;
  message: string | null;
  started_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

export interface ApiKeyPublic {
  id: string;
  name: string;
  key_prefix: string;
  host_id: string | null;
  host_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeyPublic {
  key: string;
}

// --- API ---

export const api = {
  auth: {
    login(data: { email: string; password: string }) {
      return request<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    me() {
      return request<UserPublic>("/api/auth/me");
    },
  },
  dashboard: {
    summary() {
      return request<DashboardSummary>("/api/v1/dashboard/summary");
    },
  },
  hosts: {
    list() {
      return request<HostPublic[]>("/api/v1/hosts");
    },
    get(id: string) {
      return request<HostDetail>(`/api/v1/hosts/${id}`);
    },
    update(id: string, data: { description?: string | null }) {
      return request<HostPublic>(`/api/v1/hosts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    delete(id: string) {
      return request<void>(`/api/v1/hosts/${id}`, { method: "DELETE" });
    },
  },
  checks: {
    list(params?: { status?: string; host_id?: string }) {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.host_id) qs.set("host_id", params.host_id);
      const q = qs.toString();
      return request<CheckPublic[]>(`/api/v1/checks${q ? `?${q}` : ""}`);
    },
    results(checkId: string, params?: { limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      const q = qs.toString();
      return request<CheckResultPublic[]>(`/api/v1/checks/${checkId}/results${q ? `?${q}` : ""}`);
    },
  },
  alerts: {
    list(params?: { active?: boolean }) {
      const qs = new URLSearchParams();
      if (params?.active !== undefined) qs.set("active", String(params.active));
      const q = qs.toString();
      return request<AlertPublic[]>(`/api/v1/alerts${q ? `?${q}` : ""}`);
    },
    acknowledge(id: string) {
      return request<AlertPublic>(`/api/v1/alerts/${id}/acknowledge`, { method: "POST" });
    },
    resolve(id: string) {
      return request<AlertPublic>(`/api/v1/alerts/${id}/resolve`, { method: "POST" });
    },
  },
  apiKeys: {
    list() {
      return request<ApiKeyPublic[]>("/api/v1/api-keys");
    },
    create(data: { name: string; host_id?: string | null }) {
      return request<ApiKeyCreated>("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    delete(id: string) {
      return request<void>(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    },
  },
  users: {
    list() {
      return request<AdminUser[]>("/api/v1/users");
    },
    create(data: { email: string; password: string; is_admin?: boolean }) {
      return request<AdminUser>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(id: string, data: { is_active?: boolean; is_admin?: boolean }) {
      return request<AdminUser>(`/api/v1/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    changePassword(id: string, data: { new_password: string }) {
      return request<AdminUser>(`/api/v1/users/${id}/change-password`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};
