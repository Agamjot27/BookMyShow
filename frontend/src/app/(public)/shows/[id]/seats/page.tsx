import { Suspense } from "react";
import { SeatLayoutPage } from "@/components/shows/seat-layout-page";

export const metadata = {
  title: "Select Seats | BookMyShow",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading seats…</div>}>
      <SeatLayoutPage showId={id} />
    </Suspense>
  );
}
