"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationState {
  city: string;          // Display name e.g. "Manipal"
  slug: string;          // URL-safe slug e.g. "manipal"
  detecting: boolean;    // True while geolocation + reverse-geocode is in-flight
  error: string | null;  // Last detection error message
}

interface LocationContextValue extends LocationState {
  setCity: (city: string) => void;
  detectFromBrowser: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "bms_city";
const FALLBACK_CITY = "Mumbai";

function toSlug(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // Nominatim (OpenStreetMap) — free, no API key required.
  // Returns city → town → village → county in priority order.
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en", "User-Agent": "BookMyShow-Clone/1.0" },
  });
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();
  const addr = data.address ?? {};
  const city =
    addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? null;
  if (!city) throw new Error("Could not determine city from coordinates");
  return city as string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    city: FALLBACK_CITY,
    slug: toSlug(FALLBACK_CITY),
    detecting: false,
    error: null,
  });

  // Persist + derive slug whenever city changes
  const applyCity = useCallback((city: string) => {
    const slug = toSlug(city);
    setState({ city, slug, detecting: false, error: null });
    try {
      localStorage.setItem(STORAGE_KEY, city);
    } catch {
      // Storage blocked — ignore
    }
  }, []);

  // Geolocation → reverse geocode
  const detectFromBrowser = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "Geolocation is not supported by your browser.",
      }));
      return;
    }
    setState((s) => ({ ...s, detecting: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const city = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          applyCity(city);
        } catch {
          setState((s) => ({
            ...s,
            detecting: false,
            error: "Could not determine your city. Please select manually.",
          }));
        }
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Please select your city manually."
            : "Could not get your location. Please select manually.";
        setState((s) => ({ ...s, detecting: false, error: msg }));
      },
      { timeout: 8000 },
    );
  }, [applyCity]);

  // On mount: restore from localStorage, else auto-detect
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        applyCity(saved);
        return;
      }
    } catch {
      // Storage blocked
    }
    detectFromBrowser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider
      value={{ ...state, setCity: applyCity, detectFromBrowser }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within <LocationProvider>");
  return ctx;
}
