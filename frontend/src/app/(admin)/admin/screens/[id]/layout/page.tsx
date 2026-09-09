"use client";
import { use } from "react";
import { LayoutBuilder } from "@/components/admin/layout-builder";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LayoutBuilder screenId={id} />;
}
