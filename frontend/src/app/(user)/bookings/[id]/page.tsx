"use client";

import { use } from "react";
import { TicketPage } from "@/components/bookings/ticket-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TicketPage bookingId={id} />;
}
