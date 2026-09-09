"use client";
import { use } from "react";
import { VenueDetail } from "@/components/admin/venue-detail";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <VenueDetail venueId={id} />;
}
