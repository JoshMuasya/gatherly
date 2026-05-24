import { auth } from "@/lib/firebase/firebase";

async function getToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

function getActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gatherly:activeOrgId");
}

interface Options extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
}

async function request<T>(url: string, options: Options = {}): Promise<T> {
  const { skipAuth, body, ...rest } = options;
  const token = skipAuth ? null : await getToken();

  const activeOrgId = skipAuth ? null : getActiveOrgId();

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeOrgId ? { "X-Active-Org-Id": activeOrgId } : {}),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    ...rest,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  // Unwrap { success, data } envelope when present, fall back to raw json
  return (json.data !== undefined ? json.data : json) as T;
}

export const api = {
  get: <T>(url: string, opts?: Options) => request<T>(url, { ...opts, method: "GET" }),
  post: <T>(url: string, body: unknown, opts?: Options) => request<T>(url, { ...opts, method: "POST", body }),
  patch: <T>(url: string, body: unknown, opts?: Options) => request<T>(url, { ...opts, method: "PATCH", body }),
  delete: <T>(url: string, opts?: Options) => request<T>(url, { ...opts, method: "DELETE" }),
};
