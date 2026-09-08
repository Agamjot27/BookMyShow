"use client";
import type { ReactNode } from "react";
import { RouteGate } from "@/components/route-gate";
export default function UserLayout({ children }: { children: ReactNode }) {
  return <RouteGate>{children}</RouteGate>;
}
