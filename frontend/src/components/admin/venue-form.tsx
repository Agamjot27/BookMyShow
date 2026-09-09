"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { venuesApi, type Venue } from "./admin-api";
import styles from "./admin.module.css";

interface Props {
  /** Pass existing venue to render edit mode; omit for create mode. */
  venue?: Venue;
}

export function VenueForm({ venue }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const isEdit = Boolean(venue);

  const [name, setName]       = useState(venue?.name ?? "");
  const [address, setAddress] = useState(venue?.address ?? "");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim())    errs.name    = "Name is required";
    if (!address.trim()) errs.address = "Address is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !validate()) return;
    setBusy(true);
    setError("");
    try {
      if (isEdit && venue) {
        await venuesApi.update(venue.venue_id, { name: name.trim(), address: address.trim() }, session.accessToken);
        router.push(`/admin/venues/${venue.venue_id}`);
      } else {
        const created = await venuesApi.create({ name: name.trim(), address: address.trim() }, session.accessToken);
        router.push(`/admin/venues/${created.venue_id}`);
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
        {isEdit && venue && (
          <>
            <span className={styles.breadcrumbSep}>›</span>
            <Link href={`/admin/venues/${venue.venue_id}`}>{venue.name}</Link>
          </>
        )}
        <span className={styles.breadcrumbSep}>›</span>
        <span>{isEdit ? "Edit" : "New Venue"}</span>
      </nav>

      <div className={styles.formCard}>
        <h1 className={styles.formTitle}>{isEdit ? "Edit Venue" : "Create Venue"}</h1>

        {error && <div className={styles.alertError}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formField}>
            <label htmlFor="venue-name" className={styles.formLabel}>Name *</label>
            <input
              id="venue-name"
              type="text"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PVR Cinemas — Inorbit Mall"
              maxLength={500}
            />
            {fieldErrors.name && <span className={styles.formError}>{fieldErrors.name}</span>}
          </div>

          <div className={styles.formField}>
            <label htmlFor="venue-address" className={styles.formLabel}>Address *</label>
            <textarea
              id="venue-address"
              className={styles.formTextarea}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 4th Floor, Inorbit Mall, Whitefield, Bengaluru 560066"
              maxLength={500}
            />
            {fieldErrors.address && <span className={styles.formError}>{fieldErrors.address}</span>}
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Venue"}
            </button>
            <Link
              href={isEdit && venue ? `/admin/venues/${venue.venue_id}` : "/admin/venues"}
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
