import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";

import { useAuth } from "@/auth/AuthContext";

export function ProtectedRoute({ children }: { children: ReactElement }): ReactElement {
  const { user, initializing, isGuest } = useAuth();
  if (initializing) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user && !isGuest) return <Navigate to="/" replace />;
  return children;
}
