"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { RouteGate } from "@/components/route-gate";
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RouteGate role="admin"><nav>{["", "venues", "screens", "events", "shows", "bookings"].map((resource) =>
    <Link key={resource} href={`/admin/${resource}`}>{resource || "Dashboard"}</Link>)}</nav>{children}</RouteGate>;
}
