"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { eventsApi, type AdminEvent, type EventType } from "./admin-api";
import styles from "./admin.module.css";

function TypeBadge({ type }: { type: EventType }) {
  const cls =
    type === "movie"   ? styles.typeBadgeMovie :
    type === "standup" ? styles.typeBadgeStandup :
    styles.typeBadgeConcert;
  return <span className={`${styles.typeBadge} ${cls}`}>{type}</span>;
}

export function EventDetail({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [event, setEvent]     = useState<AdminEvent | null>(null);
  const [error, setError]     = useState("");
  const [delError, setDelError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    eventsApi.get(eventId, session.accessToken)
      .then(setEvent)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load event"));
  }, [session, eventId]);

  const handleDelete = async () => {
    if (!session || !event) return;
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDelError("");
    try {
      await eventsApi.delete(eventId, session.accessToken);
      router.push("/admin/events");
    } catch (e: unknown) {
      setDelError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  };

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!event) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/events">Events</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>{event.title}</span>
      </nav>

      {delError && <div className={styles.alertError}>{delError}</div>}

      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 className={styles.pageTitle}>{event.title}</h1>
            <TypeBadge type={event.type} />
          </div>
          <div className={styles.tableActions}>
            <Link href={`/admin/events/${eventId}/edit`} className={styles.btnSecondary}>
              Edit
            </Link>
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
          <span className={styles.kvLabel}>Event ID</span>
          <span className={styles.kvValue}>{event.event_id}</span>

          <span className={styles.kvLabel}>Type</span>
          <span className={styles.kvValue} style={{ textTransform: "capitalize" }}>{event.type}</span>

          <span className={styles.kvLabel}>Duration</span>
          <span className={styles.kvValue}>{event.duration} min</span>

          {event.description && (
            <>
              <span className={styles.kvLabel}>Description</span>
              <span className={styles.kvValue} style={{ fontWeight: 400, whiteSpace: "pre-wrap" }}>
                {event.description}
              </span>
            </>
          )}

          <span className={styles.kvLabel}>Poster URL</span>
          <span className={styles.kvValue}>
            {event.poster_url
              ? <a href={event.poster_url} target="_blank" rel="noreferrer" style={{ color: "#a31540", wordBreak: "break-all" }}>{event.poster_url}</a>
              : <span style={{ color: "#aaa", fontWeight: 400 }}>None</span>
            }
          </span>
        </div>

        {event.poster_url && (
          <div style={{ marginTop: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.poster_url}
              alt={`${event.title} poster`}
              style={{ maxHeight: 200, borderRadius: 8, border: "1px solid #e5e5e8" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Link href={`/admin/events/${eventId}/edit`} className={styles.btnPrimary}>
          Edit Event
        </Link>
        <Link href="/admin/events" className={styles.btnSecondary}>
          ← All Events
        </Link>
      </div>
    </div>
  );
}
