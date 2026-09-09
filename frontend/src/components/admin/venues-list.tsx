"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { venuesApi, type Venue } from "./admin-api";
import styles from "./admin.module.css";

export function VenuesList() {
  const { session } = useAuth();
  const [venues, setVenues]   = useState<Venue[] | null>(null);
  const [error, setError]     = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [delError, setDelError] = useState("");

  const load = () => {
    if (!session) return;
    setVenues(null);
    setError("");
    venuesApi.list(session.accessToken)
      .then(setVenues)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load venues"));
  };

  useEffect(load, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (v: Venue) => {
    if (!session) return;
    if (!confirm(`Delete venue "${v.name}"? This cannot be undone.`)) return;
    setDeleting(v.venue_id);
    setDelError("");
    try {
      await venuesApi.delete(v.venue_id, session.accessToken);
      setVenues((prev) => prev?.filter((x) => x.venue_id !== v.venue_id) ?? null);
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
          <h1 className={styles.pageTitle}>Venues</h1>
          <p className={styles.pageSubtitle}>Manage cinema venues and their screens</p>
        </div>
        <Link href="/admin/venues/new" className={styles.btnPrimary}>+ New Venue</Link>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {delError && <div className={styles.alertError}>{delError}</div>}

      {!venues && !error && <div className={styles.loading}>Loading venues…</div>}

      {venues && venues.length === 0 && (
        <div className={styles.emptyState}>No venues yet. Create the first one.</div>
      )}

      {venues && venues.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.venue_id}>
                  <td>
                    <Link href={`/admin/venues/${v.venue_id}`} style={{ color: "#a31540", fontWeight: 600 }}>
                      {v.name}
                    </Link>
                  </td>
                  <td>{v.address}</td>
                  <td>
                    <div className={styles.tableActions}>
                      <Link href={`/admin/venues/${v.venue_id}`} className={styles.btnSecondary}>
                        View
                      </Link>
                      <Link href={`/admin/venues/${v.venue_id}/edit`} className={styles.btnSecondary}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => handleDelete(v)}
                        disabled={deleting === v.venue_id}
                      >
                        {deleting === v.venue_id ? "Deleting…" : "Delete"}
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
