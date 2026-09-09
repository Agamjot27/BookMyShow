"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { showsApi, type AdminShow } from "./admin-api";
import styles from "./admin.module.css";

function formatDT(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function ShowDetail({ showId }: { showId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [show, setShow]         = useState<AdminShow | null>(null);
  const [error, setError]       = useState("");
  const [delError, setDelError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    showsApi.get(showId, session.accessToken)
      .then(setShow)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load show"));
  }, [session, showId]);

  const handleDelete = async () => {
    if (!session || !show) return;
    if (!confirm(`Delete this show of "${show.event_title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDelError("");
    try {
      await showsApi.delete(showId, session.accessToken);
      router.push("/admin/shows");
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  };

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!show) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;

  const isPast = new Date(show.start_time) < new Date();

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/shows">Shows</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>{show.event_title}</span>
      </nav>

      {delError && <div className={styles.alertError}>{delError}</div>}

      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className={styles.pageTitle}>{show.event_title}</h1>
            {isPast && (
              <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>Past show</span>
            )}
          </div>
          <div className={styles.tableActions}>
            <Link href={`/admin/shows/${showId}/edit`} className={styles.btnSecondary}>Edit</Link>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>

        <div className={styles.kvGrid} style={{ marginTop: 20 }}>
          <span className={styles.kvLabel}>Show ID</span>
          <span className={styles.kvValue}>{show.show_id}</span>

          <span className={styles.kvLabel}>Event</span>
          <span className={styles.kvValue}>
            <Link href={`/admin/events/${show.event_id}`} style={{ color: "#a31540" }}>
              {show.event_title}
            </Link>
          </span>

          <span className={styles.kvLabel}>Venue</span>
          <span className={styles.kvValue}>
            <Link href={`/admin/venues/${show.venue.venue_id}`} style={{ color: "#a31540" }}>
              {show.venue.name}
            </Link>
          </span>

          <span className={styles.kvLabel}>Address</span>
          <span className={styles.kvValue} style={{ fontWeight: 400 }}>{show.venue.address}</span>

          <span className={styles.kvLabel}>Screen</span>
          <span className={styles.kvValue}>{show.screen_name}</span>

          <span className={styles.kvLabel}>Start Time</span>
          <span className={styles.kvValue}>{formatDT(show.start_time)}</span>

          <span className={styles.kvLabel}>End Time</span>
          <span className={styles.kvValue}>{formatDT(show.end_time)}</span>

          <span className={styles.kvLabel}>Base Price</span>
          <span className={styles.kvValue}>₹{parseFloat(show.base_price).toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Link href={`/admin/shows/${showId}/edit`} className={styles.btnPrimary}>
          Edit Show
        </Link>
        <Link href="/admin/shows" className={styles.btnSecondary}>
          ← All Shows
        </Link>
      </div>
    </div>
  );
}
