"use client";
import { use } from "react";
import { ShowDetail } from "@/components/admin/show-detail";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ShowDetail showId={id} />;
}
