"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { venuesApi, screensApi, type Venue, type Screen } from "./admin-api";
import styles from "./admin.module.css";

export function VenueDetail({ venueId }: { venueId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [venue, setVenue]     = useState<Venue | null>(null);
  const [screens, setScreens] = useState<Screen[] | null>(null);
  const [error, setError]     = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [delError, setDelError] = useState("");

  useEffect(() => {
    if (!session) return;
    Promise.all([
      venuesApi.get(venueId, session.accessToken),
      screensApi.listByVenue(venueId, session.accessToken),
    ])
      .then(([v, s]) => { setVenue(v); setScreens(s); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load venue"));
  }, [session, venueId]);

  const handleDeleteScreen = async (s: Screen) => {
    if (!session) return;
    if (!confirm(`Delete screen "${s.name}"? All its seats will also be removed.`)) return;
    setDeleting(s.screen_id);
    setDelError("");
    try {
      await screensApi.delete(s.screen_id, session.accessToken);
      setScreens((prev) => prev?.filter((x) => x.screen_id !== s.screen_id) ?? null);
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteVenue = async () => {
    if (!session || !venue) return;
    if (!confirm(`Delete venue "${venue.name}"? This cannot be undone.`)) return;
    try {
      await venuesApi.delete(venueId, session.accessToken);
      router.push("/admin/venues");
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!venue) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/venues">Venues</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>{venue.name}</span>
      </nav>

      {delError && <div className={styles.alertError}>{delError}</div>}

      {/* Venue info */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <h1 className={styles.pageTitle}>{venue.name}</h1>
          <div className={styles.tableActions}>
            <Link href={`/admin/venues/${venueId}/edit`} className={styles.btnSecondary}>Edit Venue</Link>
            <button type="button" className={styles.btnDanger} onClick={handleDeleteVenue}>Delete Venue</button>
          </div>
        </div>
        <div className={styles.kvGrid} style={{ marginTop: 16 }}>
          <span className={styles.kvLabel}>Venue ID</span>
          <span className={styles.kvValue}>{venue.venue_id}</span>
          <span className={styles.kvLabel}>Address</span>
          <span className={styles.kvValue}>{venue.address}</span>
        </div>
      </div>

      {/* Screens */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className={styles.sectionCardTitle} style={{ margin: 0 }}>Screens</h2>
          <Link href={`/admin/screens/new?venue_id=${venueId}`} className={styles.btnPrimary}>+ Add Screen</Link>
        </div>

        {!screens && <div className={styles.loading}>Loading screens…</div>}
        {screens && screens.length === 0 && (
          <div className={styles.emptyState} style={{ padding: "24px 0" }}>
            No screens yet. Add the first screen to this venue.
          </div>
        )}
        {screens && screens.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Screen Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {screens.map((s) => (
                  <tr key={s.screen_id}>
                    <td>
                      <Link href={`/admin/screens/${s.screen_id}`} style={{ color: "#a31540", fontWeight: 600 }}>
                        {s.name}
                      </Link>
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        <Link href={`/admin/screens/${s.screen_id}`} className={styles.btnSecondary}>View</Link>
                        <Link href={`/admin/screens/${s.screen_id}/edit`} className={styles.btnSecondary}>Edit</Link>
                        <Link href={`/admin/screens/${s.screen_id}/layout`} className={styles.btnSecondary}>Layout</Link>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          onClick={() => handleDeleteScreen(s)}
                          disabled={deleting === s.screen_id}
                        >
                          {deleting === s.screen_id ? "Deleting…" : "Delete"}
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
    </div>
  );
}
