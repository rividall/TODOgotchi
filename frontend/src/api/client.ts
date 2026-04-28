const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type TokenGetter = () => string | null;
type TokenRefresher = () => Promise<string | null>;
type LogoutHandler = () => void;

let getAccessToken: TokenGetter = () => null;
let refreshAccessToken: TokenRefresher = async () => null;
let onUnauthorized: LogoutHandler = () => {};

export function configureApiAuth(opts: {
  getAccessToken: TokenGetter;
  refreshAccessToken: TokenRefresher;
  onUnauthorized: LogoutHandler;
}): void {
  getAccessToken = opts.getAccessToken;
  refreshAccessToken = opts.refreshAccessToken;
  onUnauthorized = opts.onUnauthorized;
}

interface RequestOptions {
  method: string;
  body?: unknown;
  formData?: FormData;
  authenticated?: boolean;
}

async function buildHeaders(opts: RequestOptions, token: string | null): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.authenticated !== false && token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function doFetch(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const init: RequestInit = {
    method: opts.method,
    headers: await buildHeaders(opts, token),
  };
  if (opts.formData) init.body = opts.formData;
  else if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  return fetch(`${BASE_URL}${path}`, init);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, body.detail || response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

async function request<T>(path: string, opts: RequestOptions): Promise<T> {
  let token = getAccessToken();
  let response = await doFetch(path, opts, token);

  if (response.status === 401 && opts.authenticated !== false) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      response = await doFetch(path, opts, token);
    }
    if (response.status === 401) {
      onUnauthorized();
    }
  }

  return handleResponse<T>(response);
}

export async function apiGet<T>(path: string, opts: { authenticated?: boolean } = {}): Promise<T> {
  return request<T>(path, { method: "GET", ...opts });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts: { authenticated?: boolean } = {},
): Promise<T> {
  return request<T>(path, { method: "POST", body, ...opts });
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  opts: { authenticated?: boolean } = {},
): Promise<T> {
  return request<T>(path, { method: "PATCH", body, ...opts });
}

export async function apiDelete(path: string, opts: { authenticated?: boolean } = {}): Promise<void> {
  return request<void>(path, { method: "DELETE", ...opts });
}

export async function apiPostForm<T>(
  path: string,
  formData: FormData,
  opts: { authenticated?: boolean } = {},
): Promise<T> {
  return request<T>(path, { method: "POST", formData, ...opts });
}

export async function apiPatchForm<T>(
  path: string,
  formData: FormData,
  opts: { authenticated?: boolean } = {},
): Promise<T> {
  return request<T>(path, { method: "PATCH", formData, ...opts });
}
