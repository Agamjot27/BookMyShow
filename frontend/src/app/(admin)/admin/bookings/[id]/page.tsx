"use client";
import { use } from "react";
import { AdminBookingDetail } from "@/components/admin/admin-booking-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminBookingDetail bookingId={id} />;
}
