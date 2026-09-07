import { state } from "./state";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface EntryInput {
  appsource: string;
  username?: string;
  password?: string;
  notes?: string;
}

export interface EntryMeta {
  id: string;
  appsource: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EntryDetail extends EntryInput {
  id: string;
  createdAt?: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (state.token) headers.authorization = `Bearer ${state.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: { error?: string } | null = null;
  try {
    data = (await res.json()) as { error?: string };
  } catch {
    /* no JSON body */
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export const api = {
  status: () => request<{ setup: boolean }>("GET", "/status"),
  register: (username: string, password: string) =>
    request<{ ok: boolean }>("POST", "/register", { username, password }),
  login: (username: string, password: string) =>
    request<{ ok: boolean; token: string }>("POST", "/login", { username, password }),
  setKey: (masterKey: string) => request<{ ok: boolean }>("POST", "/setKey", { masterKey }),
  unlock: (masterKey: string) => request<{ ok: boolean }>("POST", "/unlock", { masterKey }),
  lock: () => request<{ ok: boolean }>("POST", "/lock"),
  list: () => request<{ entries: EntryMeta[] }>("GET", "/entries"),
  get: (id: string) => request<EntryDetail>("GET", `/entries/${id}`),
  create: (input: EntryInput) => request<{ ok: boolean; id: string }>("POST", "/entries", input),
  update: (id: string, input: EntryInput) => request<{ ok: boolean }>("PUT", `/entries/${id}`, input),
  updateKey: (currentMasterKey: string, newMasterKey: string) =>
    request<{ ok: boolean; message?: string }>("POST", "/updateKey", { currentMasterKey, newMasterKey }),
  remove: (id: string) => request<{ ok: boolean }>("DELETE", `/entries/${id}`),
};