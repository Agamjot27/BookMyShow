"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { screensApi, venuesApi, layoutApi, type Screen, type Venue, type Seat } from "./admin-api";
import styles from "./admin.module.css";

export function ScreenDetail({ screenId }: { screenId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [screen, setScreen]   = useState<Screen | null>(null);
  const [venue, setVenue]     = useState<Venue | null>(null);
  const [seats, setSeats]     = useState<Seat[] | null>(null);
  const [error, setError]     = useState("");
  const [delError, setDelError] = useState("");

  useEffect(() => {
    if (!session) return;
    screensApi.get(screenId, session.accessToken)
      .then(async (s) => {
        setScreen(s);
        const [v, seatList] = await Promise.all([
          venuesApi.get(s.venue_id, session.accessToken),
          layoutApi.get(screenId, session.accessToken),
        ]);
        setVenue(v);
        setSeats(seatList);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load screen"));
  }, [session, screenId]);

  const handleDelete = async () => {
    if (!session || !screen) return;
    if (!confirm(`Delete screen "${screen.name}"? All its seats will also be removed.`)) return;
    try {
      await screensApi.delete(screenId, session.accessToken);
      router.push(venue ? `/admin/venues/${venue.venue_id}` : "/admin/venues");
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!screen) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;

  // Group seats by row for preview
  const rowMap = new Map<string, Seat[]>();
  for (const seat of seats ?? []) {
    const arr = rowMap.get(seat.row) ?? [];
    arr.push(seat);
    rowMap.set(seat.row, arr);
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/venues">Venues</Link>
        {venue && (
          <>
            <span className={styles.breadcrumbSep}>›</span>
            <Link href={`/admin/venues/${venue.venue_id}`}>{venue.name}</Link>
          </>
        )}
        <span className={styles.breadcrumbSep}>›</span>
        <span>{screen.name}</span>
      </nav>

      {delError && <div className={styles.alertError}>{delError}</div>}

      {/* Screen info */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <h1 className={styles.pageTitle}>{screen.name}</h1>
          <div className={styles.tableActions}>
            <Link href={`/admin/screens/${screenId}/edit`} className={styles.btnSecondary}>Edit</Link>
            <Link href={`/admin/screens/${screenId}/layout`} className={styles.btnPrimary}>Configure Layout</Link>
            <button type="button" className={styles.btnDanger} onClick={handleDelete}>Delete</button>
          </div>
        </div>
        <div className={styles.kvGrid} style={{ marginTop: 16 }}>
          <span className={styles.kvLabel}>Screen ID</span>
          <span className={styles.kvValue}>{screen.screen_id}</span>
          <span className={styles.kvLabel}>Venue</span>
          <span className={styles.kvValue}>{venue?.name ?? screen.venue_id}</span>
          <span className={styles.kvLabel}>Total Seats</span>
          <span className={styles.kvValue}>{seats?.length ?? "—"}</span>
        </div>
      </div>

      {/* Seat layout preview */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className={styles.sectionCardTitle} style={{ margin: 0 }}>Seat Layout</h2>
          <Link href={`/admin/screens/${screenId}/layout`} className={styles.btnSecondary}>
            {(seats?.length ?? 0) > 0 ? "Edit Layout" : "Configure Layout"}
          </Link>
        </div>

        {!seats && <div className={styles.loading}>Loading seats…</div>}

        {seats && seats.length === 0 && (
          <div className={styles.emptyState} style={{ padding: "24px 0" }}>
            No seats configured yet.{" "}
            <Link href={`/admin/screens/${screenId}/layout`} style={{ color: "#a31540" }}>Set up the layout →</Link>
          </div>
        )}

        {seats && seats.length > 0 && (
          <>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              {seats.length} seat{seats.length !== 1 ? "s" : ""} across {rowMap.size} row{rowMap.size !== 1 ? "s" : ""}
            </p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Seats</th>
                    <th>Type</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(rowMap.entries()).map(([row, rowSeats]) => (
                    <tr key={row}>
                      <td><strong>{row}</strong></td>
                      <td>{rowSeats.map((s) => s.number).sort((a, b) => a - b).join(", ")}</td>
                      <td>{rowSeats[0].seat_type}</td>
                      <td>{rowSeats[0].price_tier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
