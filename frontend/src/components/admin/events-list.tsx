"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { eventsApi, EVENT_TYPES, type AdminEvent, type EventType } from "./admin-api";
import styles from "./admin.module.css";

function TypeBadge({ type }: { type: EventType }) {
  const cls =
    type === "movie"   ? styles.typeBadgeMovie :
    type === "standup" ? styles.typeBadgeStandup :
    styles.typeBadgeConcert;
  return <span className={`${styles.typeBadge} ${cls}`}>{type}</span>;
}

export function EventsList() {
  const { session } = useAuth();
  const [events, setEvents]     = useState<AdminEvent[] | null>(null);
  const [error, setError]       = useState("");
  const [typeFilter, setFilter] = useState<EventType | "">("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [delError, setDelError] = useState("");

  const load = () => {
    if (!session) return;
    setEvents(null);
    setError("");
    eventsApi.list(session.accessToken, 1, 100)
      .then((d) => setEvents(d.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load events"));
  };

  useEffect(load, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (ev: AdminEvent) => {
    if (!session) return;
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    setDeleting(ev.event_id);
    setDelError("");
    try {
      await eventsApi.delete(ev.event_id, session.accessToken);
      setEvents((prev) => prev?.filter((x) => x.event_id !== ev.event_id) ?? null);
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const visible = typeFilter
    ? (events ?? []).filter((e) => e.type === typeFilter)
    : (events ?? []);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Events</h1>
          <p className={styles.pageSubtitle}>Movies, stand-up shows and concerts</p>
        </div>
        <Link href="/admin/events/new" className={styles.btnPrimary}>+ New Event</Link>
      </div>

      {/* Type filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          className={typeFilter === "" ? styles.btnPrimary : styles.btnSecondary}
          onClick={() => setFilter("")}
          style={{ padding: "6px 14px" }}
        >
          All
        </button>
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={typeFilter === t ? styles.btnPrimary : styles.btnSecondary}
            onClick={() => setFilter(typeFilter === t ? "" : t)}
            style={{ padding: "6px 14px", textTransform: "capitalize" }}
          >
            {t}
          </button>
        ))}
      </div>

      {error    && <div className={styles.alertError}>{error}</div>}
      {delError && <div className={styles.alertError}>{delError}</div>}

      {!events && !error && <div className={styles.loading}>Loading events…</div>}

      {events && visible.length === 0 && (
        <div className={styles.emptyState}>
          {typeFilter ? `No ${typeFilter} events yet.` : "No events yet. Create the first one."}
        </div>
      )}

      {events && visible.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ev) => (
                <tr key={ev.event_id}>
                  <td>
                    <Link
                      href={`/admin/events/${ev.event_id}`}
                      style={{ color: "#a31540", fontWeight: 600 }}
                    >
                      {ev.title}
                    </Link>
                  </td>
                  <td><TypeBadge type={ev.type} /></td>
                  <td>{ev.duration} min</td>
                  <td>
                    <div className={styles.tableActions}>
                      <Link href={`/admin/events/${ev.event_id}`} className={styles.btnSecondary}>
                        View
                      </Link>
                      <Link href={`/admin/events/${ev.event_id}/edit`} className={styles.btnSecondary}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => handleDelete(ev)}
                        disabled={deleting === ev.event_id}
                      >
                        {deleting === ev.event_id ? "Deleting…" : "Delete"}
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
