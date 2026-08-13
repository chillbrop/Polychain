const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params, signal } = options;

  const url = new URL(`${API_URL}/api${path}`, ORIGIN);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString(), {
    method,
    signal,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh")) {
    const refreshed = await api<{ ok: boolean }>("/auth/refresh", { method: "POST" }).catch(() => null);
    if (refreshed?.ok) {
      return api<T>(path, options);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message = (data as { error?: string })?.error || "Request failed";
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const get = <T>(path: string, params?: Record<string, string | number | undefined>, signal?: AbortSignal) =>
  api<T>(path, { params, signal });

export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });

export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body });

export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
