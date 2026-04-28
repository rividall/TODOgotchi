import { apiGet, apiPost } from "@/api/client";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenOnly {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export function login(email: string, password: string): Promise<TokenPair> {
  return apiPost<TokenPair>("/auth/login", { email, password }, { authenticated: false });
}

export function register(email: string, username: string, password: string): Promise<TokenPair> {
  return apiPost<TokenPair>(
    "/auth/register",
    { email, username, password },
    { authenticated: false },
  );
}

export function refreshToken(refresh_token: string): Promise<AccessTokenOnly> {
  return apiPost<AccessTokenOnly>(
    "/auth/refresh",
    { refresh_token },
    { authenticated: false },
  );
}

export function getMe(): Promise<User> {
  return apiGet<User>("/auth/me");
}
