import { Suspense } from "react";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata = {
  title: "Checkout | BookMyShow",
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center" }}>Loading checkout…</div>}>
      <CheckoutPage />
    </Suspense>
  );
}
