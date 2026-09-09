"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { showsApi, eventsApi, screensApi, venuesApi, type AdminShow, type AdminEvent, type Screen, type Venue } from "./admin-api";
import styles from "./admin.module.css";

interface Props {
  show?: AdminShow; // present → edit mode
}

/** Convert an ISO string to the format datetime-local inputs expect: YYYY-MM-DDTHH:mm */
function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ShowForm({ show }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const isEdit = Boolean(show);

  // Form state
  const [eventId, setEventId]     = useState(show?.event_id ?? "");
  const [screenId, setScreenId]   = useState(show?.screen_id ?? "");
  const [startTime, setStartTime] = useState(show ? toDatetimeLocal(show.start_time) : "");
  const [basePrice, setBasePrice] = useState(show ? parseFloat(show.base_price).toFixed(2) : "");

  // Reference data
  const [events, setEvents]   = useState<AdminEvent[]>([]);
  const [venues, setVenues]   = useState<Venue[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [allScreens, setAllScreens] = useState<Screen[]>([]);

  // UI state
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [fieldErrors, setFE]  = useState<Record<string, string>>({});

  // Load reference data once
  useEffect(() => {
    if (!session) return;
    Promise.all([
      eventsApi.list(session.accessToken, 1, 200).then((d) => d.items),
      venuesApi.list(session.accessToken),
      fetch("/api/admin/screens", {
        headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store",
      }).then((r) => r.json()).then((d: { screens: Screen[] }) => d.screens),
    ])
      .then(([evs, vs, scs]) => {
        setEvents(evs);
        setVenues(vs);
        setAllScreens(scs);
        // In create mode, show all screens initially
        setScreens(scs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load form data"));
  }, [session]);

  // In create mode, filter screens when a venue is selected via event→screen relation.
  // We allow selecting any screen regardless; venue just helps filter the list.
  const [venueFilter, setVenueFilter] = useState("");
  useEffect(() => {
    if (isEdit) return;
    setScreens(venueFilter ? allScreens.filter((s) => s.venue_id === venueFilter) : allScreens);
    setScreenId("");
  }, [venueFilter, allScreens, isEdit]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isEdit && !eventId)  errs.event_id  = "Event is required";
    if (!isEdit && !screenId) errs.screen_id = "Screen is required";
    if (!startTime)           errs.start_time = "Start time is required";
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) errs.base_price = "Price must be a non-negative number";
    if (basePrice && !/^\d{1,12}(\.\d{1,2})?$/.test(basePrice.trim())) {
      errs.base_price = "Price must have at most 2 decimal places";
    }
    setFE(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !validate()) return;
    setBusy(true);
    setError("");
    // Convert datetime-local value to ISO-8601 with timezone
    const isoStart = new Date(startTime).toISOString();
    try {
      if (isEdit && show) {
        const patch: { start_time?: string; base_price?: string } = {};
        if (startTime !== toDatetimeLocal(show.start_time)) patch.start_time = isoStart;
        if (basePrice.trim() !== parseFloat(show.base_price).toFixed(2)) patch.base_price = basePrice.trim();
        if (Object.keys(patch).length === 0) {
          router.push(`/admin/shows/${show.show_id}`);
          return;
        }
        await showsApi.update(show.show_id, patch, session.accessToken);
        router.push(`/admin/shows/${show.show_id}`);
      } else {
        const created = await showsApi.create(
          { event_id: eventId, screen_id: screenId, start_time: isoStart, base_price: basePrice.trim() },
          session.accessToken,
        );
        router.push(`/admin/shows/${created.show_id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  // In edit mode, look up display names
  const editEventTitle  = show?.event_title ?? "";
  const editScreenName  = show ? `${show.venue.name} — ${show.screen_name}` : "";

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/shows">Shows</Link>
        {isEdit && show && (
          <>
            <span className={styles.breadcrumbSep}>›</span>
            <Link href={`/admin/shows/${show.show_id}`}>{show.event_title}</Link>
          </>
        )}
        <span className={styles.breadcrumbSep}>›</span>
        <span>{isEdit ? "Edit Show" : "Schedule Show"}</span>
      </nav>

      <div className={styles.formCard} style={{ maxWidth: 620 }}>
        <h1 className={styles.formTitle}>{isEdit ? "Edit Show" : "Schedule a Show"}</h1>

        {error && <div className={styles.alertError}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Create-only fields ── */}
          {!isEdit && (
            <>
              <div className={styles.formField}>
                <label htmlFor="show-event" className={styles.formLabel}>Event *</label>
                <select
                  id="show-event"
                  className={styles.formSelect}
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">— Select an event —</option>
                  {events.map((ev) => (
                    <option key={ev.event_id} value={ev.event_id}>
                      {ev.title} ({ev.type}, {ev.duration} min)
                    </option>
                  ))}
                </select>
                {fieldErrors.event_id && <span className={styles.formError}>{fieldErrors.event_id}</span>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="show-venue-filter" className={styles.formLabel}>Filter by Venue</label>
                <select
                  id="show-venue-filter"
                  className={styles.formSelect}
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                >
                  <option value="">— All venues —</option>
                  {venues.map((v) => (
                    <option key={v.venue_id} value={v.venue_id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label htmlFor="show-screen" className={styles.formLabel}>Screen *</label>
                <select
                  id="show-screen"
                  className={styles.formSelect}
                  value={screenId}
                  onChange={(e) => setScreenId(e.target.value)}
                >
                  <option value="">— Select a screen —</option>
                  {screens.map((sc) => {
                    const vname = venues.find((v) => v.venue_id === sc.venue_id)?.name ?? sc.venue_id;
                    return (
                      <option key={sc.screen_id} value={sc.screen_id}>
                        {vname} — {sc.name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.screen_id && <span className={styles.formError}>{fieldErrors.screen_id}</span>}
              </div>
            </>
          )}

          {/* ── Edit-mode: show locked fields as read-only ── */}
          {isEdit && (
            <div className={styles.formField}>
              <span className={styles.formLabel}>Event &amp; Screen</span>
              <div style={{ fontSize: 14, color: "#444", padding: "9px 0" }}>
                {editEventTitle} — {editScreenName}
                <span style={{ marginLeft: 8, fontSize: 11, color: "#aaa" }}>(cannot be changed)</span>
              </div>
            </div>
          )}

          {/* ── Shared fields ── */}
          <div className={styles.formField}>
            <label htmlFor="show-start" className={styles.formLabel}>Start Time *</label>
            <input
              id="show-start"
              type="datetime-local"
              className={styles.formInput}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <span className={styles.formHint}>
              End time is calculated automatically from the event duration.
            </span>
            {fieldErrors.start_time && <span className={styles.formError}>{fieldErrors.start_time}</span>}
          </div>

          <div className={styles.formField}>
            <label htmlFor="show-price" className={styles.formLabel}>Base Price (₹) *</label>
            <input
              id="show-price"
              type="number"
              className={styles.formInput}
              value={basePrice}
              min={0}
              step="0.01"
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="e.g. 250.00"
              style={{ maxWidth: 200 }}
            />
            {fieldErrors.base_price && <span className={styles.formError}>{fieldErrors.base_price}</span>}
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save Changes" : "Schedule Show"}
            </button>
            <Link
              href={isEdit && show ? `/admin/shows/${show.show_id}` : "/admin/shows"}
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
