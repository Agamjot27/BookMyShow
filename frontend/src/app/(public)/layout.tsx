import Link from "next/link";
import type { ReactNode } from "react";
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <><nav><Link href="/">Events</Link><Link href="/bookings">My bookings</Link><Link href="/login">Sign in</Link></nav>{children}</>;
}
