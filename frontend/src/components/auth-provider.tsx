"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { AuthModal } from "./auth/auth-modal";

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
  session:         Session | null;
  loading:         boolean;
  login:           (accessToken: string, refreshToken: string, expiresIn: number, user: User) => void;
  logout:          () => Promise<void>;
  openAuthModal:   () => void;
  closeAuthModal:  () => void;
  isAuthModalOpen: boolean;
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const mounted = useRef(false);

  const readSession = useCallback((): Session | null => {
    try {
      const accessToken = localStorage.getItem(KEY_ACCESS);
      const refreshToken = localStorage.getItem(KEY_REFRESH);
      const expiresAt = Number(localStorage.getItem(KEY_EXPIRES));
      const user = JSON.parse(localStorage.getItem(KEY_USER) ?? "null") as User | null;
      return accessToken && refreshToken && Number.isFinite(expiresAt) && user
        ? { accessToken, refreshToken, expiresAt, user } : null;
    } catch { return null; }
  }, []);

  const persistSession = useCallback((s: Session) => {
    // Refresh token is the final write and the cross-tab change notification.
    localStorage.setItem(KEY_ACCESS, s.accessToken);
    localStorage.setItem(KEY_EXPIRES, String(s.expiresAt));
    localStorage.setItem(KEY_USER, JSON.stringify(s.user));
    localStorage.setItem(KEY_REFRESH, s.refreshToken);
  }, []);

  const clearStorage = useCallback(() => {
    try {
      [KEY_ACCESS, KEY_EXPIRES, KEY_USER, KEY_REFRESH].forEach(k => localStorage.removeItem(k));
    } catch { /* storage blocked */ }
  }, []);

  type RefreshResult = { session: Session | null; retry: boolean };
  const doRefresh = useCallback(async (expected: Session): Promise<RefreshResult> => {
    try {
      // Web Locks serialize same-origin tabs. Without them, defer rather than
      // risk concurrently consuming a single-use refresh token.
      if (!navigator.locks) return { session: expected, retry: true };
      return await navigator.locks.request("bms-session-refresh", async () => {
        const current = readSession();
        if (!current || current.refreshToken !== expected.refreshToken) {
          return { session: current, retry: false };
        }
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: current.refreshToken }),
          signal: AbortSignal.timeout(15_000),
        });
        const data = await res.json();
        // A login/logout in another tab may have happened during the request.
        const latest = readSession();
        if (!latest || latest.refreshToken !== current.refreshToken) {
          return { session: latest, retry: false };
        }
        if (!res.ok) {
          if (res.status === 401 && data.error?.code === "REFRESH_TOKEN_INVALID") {
            clearStorage();
            return { session: null, retry: false };
          }
          return { session: current, retry: true };
        }
        if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string" ||
            typeof data.expires_in !== "number" || data.expires_in <= 0 || !data.user) {
          return { session: current, retry: true };
        }
        const next: Session = {
          accessToken: data.access_token, refreshToken: data.refresh_token,
          expiresAt: Date.now() + data.expires_in * 1000, user: data.user,
        };
        persistSession(next);
        return { session: next, retry: false };
      });
    } catch {
      // Network, timeout, malformed response and storage errors are not logout.
      return { session: readSession(), retry: true };
    }
  }, [readSession, persistSession, clearStorage]);

  const scheduleRefresh = useCallback((s: Session, retry = false) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = retry ? 30_000 : Math.max(0, s.expiresAt - Date.now() - 60_000);
    refreshTimerRef.current = setTimeout(async () => {
      const result = await doRefresh(s);
      if (!mounted.current) return;
      // Re-read before updating UI so stale completions cannot replace a newer login.
      const latest = readSession();
      const next = latest?.refreshToken === result.session?.refreshToken ? result.session : latest;
      setSession(next && next.expiresAt > Date.now() ? next : null);
      if (next) scheduleRefresh(next, result.retry);
    }, delay);
  }, [doRefresh, readSession]);

  useEffect(() => {
    mounted.current = true;
    const restore = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const stored = readSession();
      setSession(stored && stored.expiresAt > Date.now() ? stored : null);
      if (stored) scheduleRefresh(stored);
      setLoading(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === KEY_REFRESH || event.key === null)) restore();
    };
    restore();
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", restore);
    return () => {
      mounted.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", restore);
    };
  }, [readSession, scheduleRefresh]);

  const login = useCallback((accessToken: string, refreshToken: string, expiresIn: number, user: User) => {
    const s: Session = { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000, user };
    try { persistSession(s); } catch { /* storage blocked */ }
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
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* best-effort */ }
    }
  }, [session, clearStorage]);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        login,
        logout,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
      }}
    >
      {children}
      <AuthModal open={isAuthModalOpen} onClose={closeAuthModal} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider is required");
  return ctx;
}
