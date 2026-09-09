"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type User = { user_id: string; name: string; email: string; role: "user" | "admin" };

interface Session {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number; // epoch ms
  user:         User;
}

interface AuthContextValue {
  session:  Session | null;
  loading:  boolean;
  login:    (accessToken: string, refreshToken: string, expiresIn: number, user: User) => void;
  logout:   () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEY_ACCESS   = "bms_access_token";
const KEY_REFRESH  = "bms_refresh_token";
const KEY_EXPIRES  = "bms_token_expires";
const KEY_USER     = "bms_user";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist session to localStorage ──────────────────────────────────────
  const persistSession = useCallback((s: Session) => {
    try {
      localStorage.setItem(KEY_ACCESS,  s.accessToken);
      localStorage.setItem(KEY_REFRESH, s.refreshToken);
      localStorage.setItem(KEY_EXPIRES, String(s.expiresAt));
      localStorage.setItem(KEY_USER,    JSON.stringify(s.user));
    } catch { /* storage blocked */ }
  }, []);

  const clearStorage = useCallback(() => {
    try {
      [KEY_ACCESS, KEY_REFRESH, KEY_EXPIRES, KEY_USER].forEach((k) => localStorage.removeItem(k));
    } catch { /* storage blocked */ }
  }, []);

  // ── Silent token refresh ──────────────────────────────────────────────────
  const doRefresh = useCallback(async (refreshToken: string): Promise<Session | null> => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json() as {
        access_token: string; refresh_token: string; expires_in: number; user: User;
      };
      const next: Session = {
        accessToken:  data.access_token,
        refreshToken: data.refresh_token,
        expiresAt:    Date.now() + data.expires_in * 1000,
        user:         data.user,
      };
      persistSession(next);
      return next;
    } catch { return null; }
  }, [persistSession]);

  // ── Schedule a refresh 60s before expiry ─────────────────────────────────
  const scheduleRefresh = useCallback((s: Session) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = s.expiresAt - Date.now() - 60_000;
    if (delay <= 0) return;
    refreshTimerRef.current = setTimeout(async () => {
      const next = await doRefresh(s.refreshToken);
      if (next) { setSession(next); scheduleRefresh(next); }
      else { setSession(null); clearStorage(); }
    }, delay);
  }, [doRefresh, clearStorage]);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const accessToken  = localStorage.getItem(KEY_ACCESS);
        const refreshToken = localStorage.getItem(KEY_REFRESH);
        const expiresAt    = Number(localStorage.getItem(KEY_EXPIRES) ?? 0);
        const userRaw      = localStorage.getItem(KEY_USER);

        if (!accessToken || !refreshToken || !userRaw) { setLoading(false); return; }

        const user: User = JSON.parse(userRaw);

        // If access token is still valid (>60s left), restore immediately
        if (expiresAt - Date.now() > 60_000) {
          const s: Session = { accessToken, refreshToken, expiresAt, user };
          setSession(s);
          scheduleRefresh(s);
        } else {
          // Expired — try to refresh silently
          const next = await doRefresh(refreshToken);
          if (next) { setSession(next); scheduleRefresh(next); }
          else clearStorage();
        }
      } catch { clearStorage(); }
      finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────
  const login = useCallback((
    accessToken: string, refreshToken: string, expiresIn: number, user: User,
  ) => {
    const s: Session = { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000, user };
    persistSession(s);
    setSession(s);
    scheduleRefresh(s);
  }, [persistSession, scheduleRefresh]);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const token = session?.accessToken;
    setSession(null);
    clearStorage();
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* best-effort */ }
    }
  }, [session, clearStorage]);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider is required");
  return ctx;
}
