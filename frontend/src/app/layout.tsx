import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { LocationProvider } from "@/components/location-context";
import "./globals.css";
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning prevents false-positive hydration errors caused
          by browser extensions that inject attributes onto <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <AuthProvider>
          <LocationProvider>{children}</LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
