"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
export function RouteGate({ children, role }: { children: ReactNode; role?: "admin" }) {
  const { session } = useAuth();
  if (!session) return <main><h1>Sign in required</h1><Link href="/login">Sign in</Link></main>;
  if (role && session.user.role !== role) return <main><h1>Access denied</h1></main>;
  return <>{children}</>;
}
