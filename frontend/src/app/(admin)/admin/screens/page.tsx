"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { screensApi, venuesApi, type Screen, type Venue } from "@/components/admin/admin-api";
import styles from "@/components/admin/admin.module.css";

export default function Page() {
  const { session } = useAuth();
  const [screens, setScreens] = useState<Screen[] | null>(null);
  const [venues, setVenues]   = useState<Map<string, string>>(new Map());
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!session) return;
    let active = true;
    setError("");
    setScreens(null);
    Promise.all([
      screensApi.list(session.accessToken),
      venuesApi.list(session.accessToken),
    ])
      .then(([items, vs]) => {
        if (!active) return;
        const map = new Map(vs.map((v: Venue) => [v.venue_id, v.name]));
        setVenues(map);
        setScreens(items);
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Failed to load screens"); });
    return () => { active = false; };
  }, [session]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Screens</h1>
          <p className={styles.pageSubtitle}>All screens across all venues</p>
        </div>
        <Link href="/admin/screens/new" className={styles.btnPrimary}>+ New Screen</Link>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {!screens && !error && <div className={styles.loading}>Loading…</div>}
      {screens && screens.length === 0 && (
        <div className={styles.emptyState}>No screens yet. Create one from a venue page or here.</div>
      )}
      {screens && screens.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Screen</th>
                <th>Venue</th>
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
                  <td>{venues.get(s.venue_id) ?? s.venue_id}</td>
                  <td>
                    <div className={styles.tableActions}>
                      <Link href={`/admin/screens/${s.screen_id}`} className={styles.btnSecondary}>View</Link>
                      <Link href={`/admin/screens/${s.screen_id}/layout`} className={styles.btnSecondary}>Layout</Link>
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
