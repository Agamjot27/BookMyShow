"use client";
import { use } from "react";
import { ScreenDetail } from "@/components/admin/screen-detail";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ScreenDetail screenId={id} />;
}
