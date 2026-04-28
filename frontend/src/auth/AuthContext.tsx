import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import * as authApi from "@/api/auth";
import type { User } from "@/api/auth";
import { configureApiAuth } from "@/api/client";
import { resetGuestStore, setGuestMode } from "@/guest/store";

interface AuthState {
  user: User | null;
  initializing: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const accessRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => accessRef.current,
      refreshAccessToken: async () => {
        const rt = refreshRef.current;
        if (!rt) return null;
        try {
          const res = await authApi.refreshToken(rt);
          accessRef.current = res.access_token;
          return res.access_token;
        } catch {
          accessRef.current = null;
          refreshRef.current = null;
          return null;
        }
      },
      onUnauthorized: () => {
        accessRef.current = null;
        refreshRef.current = null;
        setUser(null);
      },
    });
    setInitializing(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      isGuest,
      login: async (email, password) => {
        const tokens = await authApi.login(email, password);
        accessRef.current = tokens.access_token;
        refreshRef.current = tokens.refresh_token;
        setUser(await authApi.getMe());
      },
      register: async (email, username, password) => {
        const tokens = await authApi.register(email, username, password);
        accessRef.current = tokens.access_token;
        refreshRef.current = tokens.refresh_token;
        setUser(await authApi.getMe());
      },
      logout: () => {
        accessRef.current = null;
        refreshRef.current = null;
        setUser(null);
        if (isGuest) {
          setGuestMode(false);
          resetGuestStore();
          setIsGuest(false);
        }
      },
      enterGuestMode: () => {
        setGuestMode(true);
        setIsGuest(true);
      },
    }),
    [user, initializing, isGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
