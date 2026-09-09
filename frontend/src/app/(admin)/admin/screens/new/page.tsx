"use client";
import { Suspense } from "react";
import { ScreenForm } from "@/components/admin/screen-form";
export default function Page() {
  return (
    <Suspense>
      <ScreenForm />
    </Suspense>
  );
}
