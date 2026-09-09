import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { LocationProvider } from "@/components/location-context";
import "./globals.css";
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LocationProvider>{children}</LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
