"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { eventsApi, EVENT_TYPES, type AdminEvent, type EventType } from "./admin-api";
import styles from "./admin.module.css";

interface Props {
  event?: AdminEvent; // present → edit mode
  /** When editing, whether this event already has scheduled shows (locks duration). */
  hasShows?: boolean;
}

export function EventForm({ event, hasShows = false }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const isEdit = Boolean(event);

  const [type, setType]         = useState<EventType>(event?.type ?? "movie");
  const [title, setTitle]       = useState(event?.title ?? "");
  const [duration, setDuration] = useState(event?.duration?.toString() ?? "");
  const [description, setDesc]  = useState(event?.description ?? "");
  const [posterUrl, setPoster]  = useState(event?.poster_url ?? "");

  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState("");
  const [fieldErrors, setFE] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    // Only validate duration when it's editable (not locked by shows).
    if (!isEdit || !hasShows) {
      const dur = parseInt(duration, 10);
      if (!duration || isNaN(dur) || dur <= 0) errs.duration = "Duration must be a positive integer (minutes)";
    }
    if (posterUrl.trim()) {
      try {
        const u = new URL(posterUrl.trim());
        if (!["http:", "https:"].includes(u.protocol)) errs.poster_url = "Must be an http(s) URL";
      } catch {
        errs.poster_url = "Enter a valid http(s) URL or leave blank";
      }
    }
    setFE(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !validate()) return;
    setBusy(true);
    setError("");

    // Don't include duration in the PATCH when shows exist — field is disabled
    // and the backend would reject it anyway. Build the payload conditionally.
    const durationValue = (!isEdit || !hasShows) ? parseInt(duration, 10) : undefined;

    const payload = {
      type,
      title: title.trim(),
      ...(durationValue !== undefined ? { duration: durationValue } : {}),
      description: description.trim(),
      poster_url: posterUrl.trim() || null,
    };
    try {
      if (isEdit && event) {
        await eventsApi.update(event.event_id, payload, session.accessToken);
        router.push(`/admin/events/${event.event_id}`);
      } else {
        const created = await eventsApi.create(
          { type, title: title.trim(), duration: parseInt(duration, 10), description: description.trim(), poster_url: posterUrl.trim() || null },
          session.accessToken,
        );
        router.push(`/admin/events/${created.event_id}`);
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
        <Link href="/admin/events">Events</Link>
        {isEdit && event && (
          <>
            <span className={styles.breadcrumbSep}>›</span>
            <Link href={`/admin/events/${event.event_id}`}>{event.title}</Link>
          </>
        )}
        <span className={styles.breadcrumbSep}>›</span>
        <span>{isEdit ? "Edit" : "New Event"}</span>
      </nav>

      <div className={styles.formCard}>
        <h1 className={styles.formTitle}>{isEdit ? "Edit Event" : "Create Event"}</h1>

        {error && <div className={styles.alertError}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Type */}
          <div className={styles.formField}>
            <label htmlFor="event-type" className={styles.formLabel}>Type *</label>
            <select
              id="event-type"
              className={styles.formSelect}
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className={styles.formField}>
            <label htmlFor="event-title" className={styles.formLabel}>Title *</label>
            <input
              id="event-title"
              type="text"
              className={styles.formInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Dark Knight"
              maxLength={500}
            />
            {fieldErrors.title && <span className={styles.formError}>{fieldErrors.title}</span>}
          </div>

          {/* Duration */}
          <div className={styles.formField}>
            <label htmlFor="event-duration" className={styles.formLabel}>
              Duration (minutes) {(!isEdit || !hasShows) ? "*" : ""}
            </label>
            <input
              id="event-duration"
              type="number"
              className={styles.formInput}
              value={duration}
              min={1}
              max={2147483647}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 152"
              style={{ maxWidth: 180 }}
              disabled={isEdit && hasShows}
              aria-describedby={isEdit && hasShows ? "duration-locked-hint" : undefined}
            />
            {isEdit && hasShows && (
              <span id="duration-locked-hint" className={styles.formHint} style={{ color: "#b45309" }}>
                Duration is locked — this event has scheduled shows. Remove all shows first to change it.
              </span>
            )}
            {fieldErrors.duration && <span className={styles.formError}>{fieldErrors.duration}</span>}
          </div>

          {/* Description */}
          <div className={styles.formField}>
            <label htmlFor="event-desc" className={styles.formLabel}>Description</label>
            <textarea
              id="event-desc"
              className={styles.formTextarea}
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional synopsis or event details"
              rows={4}
            />
          </div>

          {/* Poster URL */}
          <div className={styles.formField}>
            <label htmlFor="event-poster" className={styles.formLabel}>Poster URL</label>
            <input
              id="event-poster"
              type="url"
              className={styles.formInput}
              value={posterUrl}
              onChange={(e) => setPoster(e.target.value)}
              placeholder="https://example.com/poster.jpg"
            />
            <span className={styles.formHint}>Optional — must be an absolute https URL</span>
            {fieldErrors.poster_url && <span className={styles.formError}>{fieldErrors.poster_url}</span>}
          </div>

          {/* Poster preview */}
          {posterUrl.trim() && !fieldErrors.poster_url && (
            <div style={{ marginBottom: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl.trim()}
                alt="Poster preview"
                style={{ maxHeight: 120, borderRadius: 6, border: "1px solid #e5e5e8" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Event"}
            </button>
            <Link
              href={isEdit && event ? `/admin/events/${event.event_id}` : "/admin/events"}
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
