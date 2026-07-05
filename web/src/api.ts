const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {}

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface Member {
  id: number;
  name: string;
  isUmpire: boolean;
  isAdmin: boolean;
}

export interface LoginResponse {
  token: string;
  member: Member;
}

export interface RegisterResponse {
  message: string;
  note?: string;
  registeredCount: number;
  groupSize: number;
}

export type Stage = "waiting_for_registrations" | "you_are_umpire" | "waiting_for_umpire" | "assigned";

export interface Position {
  name: string;
  position: number;
}

export interface StatusResponse {
  stage: Stage;
  registeredCount: number;
  groupSize: number;
  positions?: Position[];
}

export interface AssignResponse {
  positions: Position[];
}

export function register(name: string, pin: string) {
  return request<RegisterResponse>("/register", { method: "POST", body: { name, pin } });
}

export function login(name: string, pin: string) {
  return request<LoginResponse>("/login", { method: "POST", body: { name, pin } });
}

export function getStatus(token: string) {
  return request<StatusResponse>("/status", { token });
}

export function runAssignment(token: string) {
  return request<AssignResponse>("/assign", { method: "POST", token });
}

export function getPositions(token: string) {
  return request<{ positions: Position[] }>("/positions", { token });
}

export function adminReset(token: string, adminPassword: string) {
  return request<{ message: string }>("/admin/reset", {
    method: "POST",
    token,
    body: { adminPassword },
  });
}
