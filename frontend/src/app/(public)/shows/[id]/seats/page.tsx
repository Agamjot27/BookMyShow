import { Suspense } from "react";
import { SeatLayoutPage } from "@/components/shows/seat-layout-page";

export const metadata = {
  title: "Select Seats | BookMyShow",
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading seats…</div>}>
      <SeatLayoutPage />
    </Suspense>
  );
}
