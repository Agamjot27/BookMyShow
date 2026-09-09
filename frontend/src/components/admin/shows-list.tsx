"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { showsApi, type AdminShow } from "./admin-api";
import styles from "./admin.module.css";

function formatDT(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function ShowsList() {
  const { session } = useAuth();
  const [shows, setShows]       = useState<AdminShow[] | null>(null);
  const [error, setError]       = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [delError, setDelError] = useState("");

  const load = () => {
    if (!session) return;
    setShows(null);
    setError("");
    showsApi.list(session.accessToken)
      .then((d) => setShows(d.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load shows"));
  };

  useEffect(load, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (s: AdminShow) => {
    if (!session) return;
    if (!confirm(`Delete show "${s.event_title}" on ${formatDT(s.start_time)}? This cannot be undone.`)) return;
    setDeleting(s.show_id);
    setDelError("");
    try {
      await showsApi.delete(s.show_id, session.accessToken);
      setShows((prev) => prev?.filter((x) => x.show_id !== s.show_id) ?? null);
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Shows</h1>
          <p className={styles.pageSubtitle}>All scheduled shows across all screens</p>
        </div>
        <Link href="/admin/shows/new" className={styles.btnPrimary}>+ Schedule Show</Link>
      </div>

      {error    && <div className={styles.alertError}>{error}</div>}
      {delError && <div className={styles.alertError}>{delError}</div>}

      {!shows && !error && <div className={styles.loading}>Loading shows…</div>}

      {shows && shows.length === 0 && (
        <div className={styles.emptyState}>No shows scheduled yet. Create events and screens first.</div>
      )}

      {shows && shows.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>Venue / Screen</th>
                <th>Start Time</th>
                <th>Base Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shows.map((s) => (
                <tr key={s.show_id}>
                  <td>
                    <Link href={`/admin/shows/${s.show_id}`} style={{ color: "#a31540", fontWeight: 600 }}>
                      {s.event_title}
                    </Link>
                  </td>
                  <td>{s.venue.name} — {s.screen_name}</td>
                  <td>{formatDT(s.start_time)}</td>
                  <td>₹{parseFloat(s.base_price).toFixed(2)}</td>
                  <td>
                    <div className={styles.tableActions}>
                      <Link href={`/admin/shows/${s.show_id}`} className={styles.btnSecondary}>View</Link>
                      <Link href={`/admin/shows/${s.show_id}/edit`} className={styles.btnSecondary}>Edit</Link>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => handleDelete(s)}
                        disabled={deleting === s.show_id}
                      >
                        {deleting === s.show_id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
