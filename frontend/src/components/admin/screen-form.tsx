"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { screensApi, venuesApi, type Screen, type Venue } from "./admin-api";
import styles from "./admin.module.css";

interface Props {
  screen?: Screen;
}

export function ScreenForm({ screen }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const isEdit = Boolean(screen);

  // Pre-fill venue_id from query param when creating from a venue detail page
  const prefillVenueId = searchParams.get("venue_id") ?? screen?.venue_id ?? "";

  const [name, setName]       = useState(screen?.name ?? "");
  const [venueId, setVenueId] = useState(prefillVenueId);
  const [venues, setVenues]   = useState<Venue[]>([]);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session) return;
    venuesApi.list(session.accessToken).then(setVenues).catch(() => {/* silently ignore, user will see empty select */});
  }, [session]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim())   errs.name    = "Screen name is required";
    if (!isEdit && !venueId) errs.venue_id = "Venue is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !validate()) return;
    setBusy(true);
    setError("");
    try {
      if (isEdit && screen) {
        await screensApi.update(screen.screen_id, { name: name.trim() }, session.accessToken);
        router.push(`/admin/screens/${screen.screen_id}`);
      } else {
        const created = await screensApi.create({ name: name.trim(), venue_id: venueId }, session.accessToken);
        router.push(`/admin/screens/${created.screen_id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/venues">Venues</Link>
        {screen && (
          <>
            <span className={styles.breadcrumbSep}>›</span>
            <Link href={`/admin/screens/${screen.screen_id}`}>{screen.name}</Link>
          </>
        )}
        <span className={styles.breadcrumbSep}>›</span>
        <span>{isEdit ? "Edit Screen" : "New Screen"}</span>
      </nav>

      <div className={styles.formCard}>
        <h1 className={styles.formTitle}>{isEdit ? "Edit Screen" : "Create Screen"}</h1>

        {error && <div className={styles.alertError}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {!isEdit && (
            <div className={styles.formField}>
              <label htmlFor="screen-venue" className={styles.formLabel}>Venue *</label>
              <select
                id="screen-venue"
                className={styles.formSelect}
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
              >
                <option value="">— Select a venue —</option>
                {venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>{v.name}</option>
                ))}
              </select>
              {fieldErrors.venue_id && <span className={styles.formError}>{fieldErrors.venue_id}</span>}
            </div>
          )}

          <div className={styles.formField}>
            <label htmlFor="screen-name" className={styles.formLabel}>Screen Name *</label>
            <input
              id="screen-name"
              type="text"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Screen 1 — IMAX"
              maxLength={200}
            />
            {fieldErrors.name && <span className={styles.formError}>{fieldErrors.name}</span>}
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Screen"}
            </button>
            <Link
              href={isEdit && screen ? `/admin/screens/${screen.screen_id}` : "/admin/venues"}
              className={styles.btnSecondary}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
