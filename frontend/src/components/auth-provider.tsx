"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
export type User = { user_id: string; name: string; email: string; role: "user" | "admin" };
type Session = { accessToken: string; user: User };
type AuthContextValue = { session: Session | null; setSession: (session: Session | null) => void };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  // Login integration is intentionally not implemented. No development bypass.
  const [session, setSession] = useState<Session | null>(null);
  return <AuthContext.Provider value={{ session, setSession }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
