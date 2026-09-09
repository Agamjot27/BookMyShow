"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";

export function RouteGate({ children, role }: { children: ReactNode; role?: "admin" }) {
  const { session, loading, openAuthModal } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <p style={{ color: "#666", fontSize: "14px" }}>Verifying session…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111" }}>Sign in required</h1>
        <p style={{ fontSize: "14px", color: "#666", maxWidth: "360px" }}>
          You need to be signed in to view your bookings and manage your profile.
        </p>
        <button
          type="button"
          onClick={openAuthModal}
          style={{
            background: "#d71935",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Sign In with Email OTP
        </button>
      </div>
    );
  }

  if (role && session.user.role !== role) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#d71935" }}>Access Denied</h1>
        <p style={{ fontSize: "14px", color: "#666" }}>You do not have administrative privileges to view this page.</p>
        <Link href="/" style={{ color: "#d71935", textDecoration: "underline", fontSize: "14px" }}>
          Return to Home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
