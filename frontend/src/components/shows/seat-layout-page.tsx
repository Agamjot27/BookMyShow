"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Wheelchair } from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import { CHECKOUT_KEY, readCheckoutSession, saveCheckoutSession } from "@/components/checkout/booking-session";
import styles from "./seat-layout.module.css";

const HOLD_ATTEMPT_KEY = "bms_seat_hold_attempt";
type HoldAttempt = { show_id: string; hold_token: string; seat_ids: string[]; user_id: string };
const sameSeats = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeatAvailability = "available" | "booked" | "held_by_me" | "held_by_other";

export interface BackendSeat {
  seat_id: string;
  row: string;
  number: number;
  label: string;
  seat_type: string;
  price_tier: string;
  status: SeatAvailability;
  expires_at: string | null;
}

export interface ShowDetails {
  show_id: string;
  event_id: string;
  screen_id: string;
  start_time: string;
  end_time: string;
  base_price: string;
  event_title: string;
  screen_name: string;
  venue: {
    venue_id: string;
    name: string;
    address: string;
  };
}

export interface TierInfo {
  tierKey: string;
  label: string;
  price: number;
  rows: string[];
}

// ---------------------------------------------------------------------------
// How Many Seats Modal — animated bottom sheet
// ---------------------------------------------------------------------------

function SeatCountModal({
  tiers,
  onConfirm,
}: {
  tiers: TierInfo[];
  onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState(2);
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    setClosing(true);
  }, []);

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (closing && e.animationName.includes("slideDown")) {
        onConfirm(count);
      }
    },
    [closing, count, onConfirm],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  return (
    <div
      className={`${styles.modalBackdrop} ${closing ? styles.backdropOut : styles.backdropIn}`}
      onClick={dismiss}
      role="presentation"
    >
      <div
        className={`${styles.modal} ${closing ? styles.sheetOut : styles.sheetIn}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <h2 id="modal-title" className={styles.modalTitle}>How many seats?</h2>
        <div className={styles.modalIllustration} aria-hidden="true">🛵</div>

        {/* Max booking per request is 6 */}
        <div className={styles.countRow} role="group" aria-label="Select number of seats">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.countBtn} ${count === n ? styles.countBtnActive : ""}`}
              onClick={() => setCount(n)}
              aria-pressed={count === n}
            >
              {n}
            </button>
          ))}
        </div>

        <hr className={styles.modalDivider} />

        {/* Dynamic tier pricing */}
        {tiers.length > 0 && (
          <div className={styles.tierPricing}>
            {tiers.map((t) => (
              <div key={t.label} className={styles.tierPriceCol}>
                <span className={styles.tierName}>{t.label}</span>
                <span className={styles.tierPrice}>₹{t.price}</span>
                <span className={styles.tierAvail}>AVAILABLE</span>
              </div>
            ))}
          </div>
        )}

        <p className={styles.bestsellerNote}>
          Select your seats to hold them securely for 5 minutes during checkout.
        </p>

        <button
          type="button"
          className={styles.selectSeatsBtn}
          onClick={dismiss}
        >
          Select Seats
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Seat Layout Component
// ---------------------------------------------------------------------------

export function SeatLayoutPage({ showId: propShowId }: { showId?: string }) {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const { session, openAuthModal } = useAuth();

  const showId = propShowId || (routeParams?.id as string);

  // Fallbacks from URL search params while backend data loads
  const movieParam   = searchParams.get("movie")   ?? "";
  const theatreParam = searchParams.get("theatre") ?? "";
  const dateParam    = searchParams.get("date")    ?? "";
  const timeParam    = searchParams.get("time")    ?? "";

  // Showtimes passed for time-switcher (format: "time|label|show_id")
  const rawTimes = searchParams.get("times") ?? "";
  const otherTimes: { time: string; label: string; id?: string }[] = useMemo(() => {
    if (!rawTimes) return [];
    return rawTimes.split(",").map((t) => {
      const [time, label = "", id] = t.split("|");
      return { time, label, id };
    });
  }, [rawTimes]);

  // State
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [seats, setSeats] = useState<BackendSeat[]>([]);
  const [layoutSeatsPerRow, setLayoutSeatsPerRow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showModal, setShowModal] = useState(true);
  const [maxSeats, setMaxSeats] = useState(2);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [capped, setCapped] = useState(false);
  const [holdError, setHoldError] = useState("");
  const [isHolding, setIsHolding] = useState(false);
  const holding = useRef(false);
  const loadVersion = useRef(0);

  // Tracks whether a background poll fetch is in-flight; prevents overlapping requests.
  const polling = useRef(false);

  // Load show details and seats map.
  // isInitial=true → show full loading state; false → silent background refresh.
  const loadShowData = useCallback(async (isInitial = false) => {
    if (!showId) return;
    const version = ++loadVersion.current;

    // For background refreshes, skip if another request is still running.
    if (!isInitial && polling.current) return;
    if (!isInitial) polling.current = true;

    try {
      if (isInitial) {
        setLoading(true);
        setLoadError("");
      }

      const headers: Record<string, string> = {};
      if (session?.accessToken) {
        headers["Authorization"] = `Bearer ${session.accessToken}`;
      }

      // On initial load fetch show info + seats together.
      // On background polls only re-fetch seats (show metadata is static).
      const fetchPairs: Promise<Response>[] = isInitial
        ? [
            fetch(`/api/shows/${showId}`, { cache: "no-store" }),
            fetch(`/api/shows/${showId}/seats`, { headers, cache: "no-store" }),
          ]
        : [
            // For polls reuse the cached show response to save a round-trip.
            Promise.resolve(new Response(null, { status: 200 })),
            fetch(`/api/shows/${showId}/seats`, { headers, cache: "no-store" }),
          ];

      const [showRes, seatsRes] = await Promise.all(fetchPairs);

      // Discard stale response if a newer version was requested.
      if (version !== loadVersion.current) return;

      if (isInitial) {
        if (!showRes.ok) {
          if (showRes.status === 404) throw new Error("Show not found or no longer active.");
          throw new Error("Could not load show information.");
        }
        if (!seatsRes.ok) {
          if (seatsRes.status === 404) throw new Error("Seat layout not found for this show.");
          throw new Error("Could not load seat layout.");
        }
        const showData = (await showRes.json()) as ShowDetails;
        const seatsData = (await seatsRes.json()) as { seats: BackendSeat[]; layout_json?: { seats_per_row?: number } };
        if (version !== loadVersion.current) return;
        setShow(showData);
        setSeats(seatsData.seats || []);
        setLayoutSeatsPerRow(seatsData.layout_json?.seats_per_row ?? 0);

        // Restore previous hold on initial load only.
        if (session) {
          const checkout = readCheckoutSession();
          const raw = sessionStorage.getItem(HOLD_ATTEMPT_KEY);
          const pending = raw ? JSON.parse(raw) as HoldAttempt : null;
          const previous = pending?.user_id === session.user.user_id && pending.show_id === showId ? pending
            : checkout?.show_id === showId ? checkout : null;
          if (previous) {
            const response = await fetch(`/api/shows/${showId}/holds/${previous.hold_token}`, { headers, cache: "no-store" });
            if (version !== loadVersion.current) return;
            if (response.ok) {
              const hold = await response.json();
              sessionStorage.setItem(HOLD_ATTEMPT_KEY, JSON.stringify({ ...hold, user_id: session.user.user_id }));
              setSelectedIds(new Set(hold.seat_ids));
              setMaxSeats(hold.seat_ids.length);
              setShowModal(false);
            }
          }
        }

        // Reconcile selection on initial load.
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev;
          const ok = new Set((seatsData.seats || [])
            .filter((s) => s.status === "available" || s.status === "held_by_me")
            .map((s) => s.seat_id));
          const next = new Set<string>();
          prev.forEach((id) => { if (ok.has(id)) next.add(id); });
          return next.size === prev.size ? prev : next;
        });
      } else {
        // Background poll: only update seat statuses; never replace show metadata.
        if (!seatsRes.ok) return; // silently ignore transient poll errors
        const seatsData = (await seatsRes.json()) as { seats: BackendSeat[] };
        if (version !== loadVersion.current) return;

        setSeats((prev) => {
          // Build a status+expires map from the fresh response.
          const fresh = new Map(seatsData.seats.map((s) => [s.seat_id, s]));
          // Only update if something actually changed (avoids re-render thrash).
          let changed = false;
          const next = prev.map((old) => {
            const f = fresh.get(old.seat_id);
            if (!f) return old;
            if (f.status !== old.status || f.expires_at !== old.expires_at) {
              changed = true;
              return { ...old, status: f.status, expires_at: f.expires_at };
            }
            return old;
          });
          return changed ? next : prev;
        });

        // Reconcile selected seats: if a seat became booked or held_by_other,
        // remove it from the user's selection (but never touch held_by_me).
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev;
          const stillSelectable = new Set(seatsData.seats
            .filter((s) => s.status === "available" || s.status === "held_by_me")
            .map((s) => s.seat_id));
          const next = new Set<string>();
          prev.forEach((id) => { if (stillSelectable.has(id)) next.add(id); });
          // Return the same reference if nothing was removed (avoids re-render).
          return next.size === prev.size ? prev : next;
        });
      }
    } catch (err) {
      if (isInitial && version === loadVersion.current) {
        setLoadError(err instanceof Error ? err.message : "Failed to load show details.");
      }
      // Background poll errors are silently swallowed.
    } finally {
      if (isInitial && version === loadVersion.current) setLoading(false);
      if (!isInitial) polling.current = false;
    }
  }, [showId, session?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    setSelectedIds(new Set());
    loadShowData(true);
    return () => { loadVersion.current++; };
  }, [loadShowData]);

  // Live polling: refresh seat availability every second while tab is visible.
  // Pauses when the document is hidden; resumes + fires immediately on focus.
  useEffect(() => {
    if (!showId) return;

    const poll = () => { if (!document.hidden) loadShowData(false); };

    const interval = setInterval(poll, 1000);

    const onVisibilityChange = () => { if (!document.hidden) loadShowData(false); };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [showId, loadShowData]);

  // Derive per-row max seat number from layout_json metadata or the seat data itself.
  // This lets us render gaps/aisles faithfully instead of packing seats consecutively.
  const rowMaxSeat = useMemo(() => {
    const map = new Map<string, number>();
    if (!seats.length) return map;
    // Compute actual max seat number per row from the seat inventory.
    seats.forEach((s) => {
      const current = map.get(s.row) ?? 0;
      if (s.number > current) map.set(s.row, s.number);
    });
    // If layout_json declares a seats_per_row, every row's width is at least that.
    // This preserves gaps/aisles at the end of rows too.
    if (layoutSeatsPerRow > 0) {
      map.forEach((val, row) => map.set(row, Math.max(val, layoutSeatsPerRow)));
    }
    return map;
  }, [seats, layoutSeatsPerRow]);

  // Build tier groupings from seat data.
  // Uses the per-seat seat_type (not just the first seat of each row) so mixed-type
  // rows are handled correctly. Each unique seat_type becomes a pricing tier.
  const tiers = useMemo((): TierInfo[] => {
    if (!seats || seats.length === 0) return [];

    const basePrice = Number(show?.base_price ?? 250);

    // Map each row to the dominant seat_type in that row (first unique type seen).
    // For a correct implementation we use per-seat type: collect all types per row
    // and pick the most common one as the row's display tier.
    const rowTypeCount = new Map<string, Map<string, number>>();
    seats.forEach((s) => {
      const type = s.seat_type || "standard";
      if (!rowTypeCount.has(s.row)) rowTypeCount.set(s.row, new Map());
      const counts = rowTypeCount.get(s.row)!;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });

    // For each row, pick the seat_type with the highest count.
    const rowType = new Map<string, string>();
    rowTypeCount.forEach((counts, row) => {
      let best = "standard";
      let bestCount = 0;
      counts.forEach((count, type) => {
        if (count > bestCount) { bestCount = count; best = type; }
      });
      rowType.set(row, best);
    });

    const typeToRows = new Map<string, string[]>();
    rowType.forEach((type, row) => {
      const list = typeToRows.get(type) || [];
      list.push(row);
      typeToRows.set(type, list);
    });

    // Standard ordering: premium at top, executive in middle, standard at bottom
    const order = ["premium", "executive", "standard"];
    const result: TierInfo[] = [];

    order.forEach((t) => {
      if (typeToRows.has(t)) {
        const rows = typeToRows.get(t)!;
        rows.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        result.push({ tierKey: t, label: t.toUpperCase(), price: basePrice, rows });
      }
    });

    typeToRows.forEach((rows, t) => {
      if (!order.includes(t)) {
        rows.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        result.push({ tierKey: t, label: t.toUpperCase(), price: basePrice, rows });
      }
    });

    return result;
  }, [seats, show?.base_price]);

  const handleModalConfirm = useCallback((count: number) => {
    setMaxSeats(count);
    setShowModal(false);
  }, []);

  const toggleSeat = useCallback(
    (seat: BackendSeat) => {
      if (seat.status === "booked" || seat.status === "held_by_other") return;

      const isSelected = selectedIds.has(seat.seat_id);

      if (!isSelected && selectedIds.size >= maxSeats) {
        setCapped(true);
        setTimeout(() => setCapped(false), 800);
        return;
      }

      if (holdError) setHoldError("");

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (isSelected) next.delete(seat.seat_id);
        else next.add(seat.seat_id);
        return next;
      });
    },
    [maxSeats, selectedIds, holdError],
  );

  const selectedSeatsList = useMemo(() => {
    return seats.filter((s) => selectedIds.has(s.seat_id));
  }, [seats, selectedIds]);

  const basePrice = Number(show?.base_price ?? 250);
  const totalPrice = selectedIds.size * basePrice;

  // Handle proceed to hold and checkout
  const handleContinue = async () => {
    if (selectedIds.size === 0 || holding.current) return;

    if (!session) {
      openAuthModal();
      return;
    }

    holding.current = true;
    setIsHolding(true);
    setHoldError("");

    try {
      const seatIds = Array.from(selectedIds).sort();
      const checkout = readCheckoutSession();
      const raw = sessionStorage.getItem(HOLD_ATTEMPT_KEY);
      const pending = raw ? JSON.parse(raw) as HoldAttempt : null;
      let previous = pending?.user_id === session.user.user_id ? pending : checkout;
      if (checkout?.attempted && (checkout.show_id !== showId || !sameSeats(checkout.seat_ids, seatIds))) {
        throw new Error("Resolve your previous checkout confirmation before starting a different selection.");
      }
      if (checkout?.attempted && checkout.show_id === showId && sameSeats(checkout.seat_ids, seatIds)) {
        router.push("/checkout");
        return;
      }
      if (previous && (previous.show_id !== showId || !sameSeats(previous.seat_ids, seatIds))) {
        const release = await fetch(`/api/shows/${previous.show_id}/holds/${previous.hold_token}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${session.accessToken}` }, signal: AbortSignal.timeout(15_000),
        });
        if (!release.ok) throw new Error("Could not release the previous hold. Retry before changing seats.");
        sessionStorage.removeItem(HOLD_ATTEMPT_KEY);
        if (checkout?.hold_token === previous.hold_token) sessionStorage.removeItem(CHECKOUT_KEY);
        previous = null;
      }
      const attempt: HoldAttempt = { show_id: showId, seat_ids: seatIds,
        hold_token: previous?.hold_token ?? crypto.randomUUID(), user_id: session.user.user_id };
      // Persist before the request; a lost response must not generate a new token.
      sessionStorage.setItem(HOLD_ATTEMPT_KEY, JSON.stringify(attempt));
      const res = await fetch(`/api/shows/${showId}/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ seat_ids: seatIds, hold_token: attempt.hold_token }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = data?.error?.code || data?.code;
        let msg = data?.error?.message || data?.message || "Failed to reserve selected seats.";
        if (code === "SEATS_UNAVAILABLE") {
          msg = "One or more selected seats were just taken or held by another user. Please choose different seats.";
        } else if (code === "SHOW_STARTED") {
          msg = "This show has already started and is closed for bookings.";
        } else if (code === "HOLD_EXPIRED") {
          msg = "Seat hold timed out. Please reselect your seats.";
        } else if (code === "MAX_SEATS_EXCEEDED") {
          msg = "You can book at most 6 seats in a single booking.";
        }
        setHoldError(msg);
        // Refresh seat availability so taken seats reflect accurately
        await loadShowData(true);
        setIsHolding(false);
        return;
      }

      // Hold succeeded: call saveCheckoutSession helper
      saveCheckoutSession({
        show_id: data.show_id,
        hold_token: data.hold_token,
        seat_ids: data.seat_ids,
      });

      // Clean navigation to checkout without calculated URL amount or seat query params
      router.push("/checkout");
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : "Could not reserve seats. Retry uses the same hold token.");
    } finally {
      holding.current = false;
      setIsHolding(false);
    }
  };

  const handleTimeSwitch = (target: { time: string; label: string; id?: string }) => {
    if (!target.id) return;
    const url = new URL(window.location.href);
    url.pathname = `/shows/${target.id}/seats`;
    url.searchParams.set("time", target.time);
    url.searchParams.set("label", target.label);
    router.replace(url.pathname + url.search);
    setSelectedIds(new Set());
    setHoldError("");
    setShowModal(true);
  };

  // Header display strings
  const displayTitle = show?.event_title || movieParam || "Movie";
  const displayTheatre = show?.venue?.name || theatreParam || "Theatre";
  const displayTime = show?.start_time
    ? new Date(show.start_time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : timeParam;
  const displayDate = show?.start_time
    ? new Date(show.start_time).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : dateParam;

  if (loading && seats.length === 0) {
    return (
      <div className={styles.page}>
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#666" }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Loading real seat layout…</p>
        </div>
      </div>
    );
  }

  if (loadError && seats.length === 0) {
    return (
      <div className={styles.page}>
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#b91c1c" }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>{loadError}</p>
          <button
            type="button"
            className={styles.selectSeatsBtn}
            style={{ maxWidth: 200, margin: "20px auto 0" }}
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft size={20} weight="bold" />
        </button>

        <div className={styles.topBarInfo}>
          <span className={styles.topBarTitle}>{displayTitle}</span>
          <span className={styles.topBarSub}>
            {displayTheatre}
            {displayDate ? ` | ${displayDate}` : ""}
            {displayTime ? ` | ${displayTime}` : ""}
          </span>
        </div>

        <div className={styles.topBarRight}>
          <button type="button" className={styles.accessibilityBtn} aria-label="Accessibility options">
            <Wheelchair size={20} />
          </button>
          {selectedIds.size > 0 && (
            <button type="button" className={styles.ticketCountBtn}>
              🎟 {selectedIds.size} Ticket{selectedIds.size > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </header>

      {/* ── Show time switcher ─────────────────────────────────────────────── */}
      {otherTimes.length > 1 && (
        <div className={styles.timeSwitcher} role="group" aria-label="Available showtimes">
          {otherTimes.map((t) => {
            const active = t.id === showId || t.time === displayTime;
            return (
              <button
                key={t.id || t.time}
                type="button"
                className={`${styles.timePill} ${active ? styles.timePillActive : ""}`}
                onClick={() => !active && handleTimeSwitch(t)}
                aria-pressed={active}
              >
                <span className={styles.timePillTime}>{t.time}</span>
                {t.label && <span className={styles.timePillLabel}>{t.label}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Error Banner if hold fails or seat taken ───────────────────────── */}
      {holdError && (
        <div className={styles.errorBanner} role="alert">
          <span>⚠️ {holdError}</span>
          <button
            type="button"
            className={styles.errorCloseBtn}
            onClick={() => setHoldError("")}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Seat grid ─────────────────────────────────────────────────────── */}
      <div className={styles.seatArea}>
        {/* Cap warning toast */}
        {capped && (
          <div className={styles.capToast} role="alert" aria-live="assertive">
            You can only select {maxSeats} seat{maxSeats > 1 ? "s" : ""}. Deselect one to change your pick.
          </div>
        )}

        {tiers.map((tier) => (
          <section key={tier.label} className={styles.tierSection} aria-label={`${tier.label} section`}>
            <div className={styles.tierHeader}>
              ₹{tier.price} {tier.label}
            </div>

            {tier.rows.map((row) => {
              const rowSeats = seats.filter((s) => s.row === row);
              rowSeats.sort((a, b) => a.number - b.number);
              // Build a position map so gaps between seat numbers render as spacers.
              const bySeatNum = new Map(rowSeats.map((s) => [s.number, s]));
              const maxNum = rowMaxSeat.get(row) ?? (rowSeats[rowSeats.length - 1]?.number ?? 0);

              return (
                <div key={row} className={styles.seatRow}>
                  <span className={styles.rowLabel} aria-label={`Row ${row}`}>
                    {row}
                  </span>
                  <div className={styles.seatGroup}>
                    {Array.from({ length: maxNum }, (_, i) => {
                      const num = i + 1;
                      const seat = bySeatNum.get(num);

                      // Gap spacer — no bookable seat at this position.
                      if (!seat) {
                        return (
                          <div
                            key={`gap-${num}`}
                            className={styles.seat}
                            style={{ visibility: "hidden", pointerEvents: "none" }}
                            aria-hidden="true"
                          />
                        );
                      }

                      const isSelected = selectedIds.has(seat.seat_id);
                      let seatClass = styles.seat_available;

                      if (isSelected) {
                        seatClass = styles.seat_selected;
                      } else if (seat.status === "booked") {
                        seatClass = styles.seat_booked;
                      } else if (seat.status === "held_by_other") {
                        seatClass = styles.seat_held_by_other;
                      } else if (seat.status === "held_by_me") {
                        seatClass = styles.seat_held_by_me;
                      }

                      const isBlocked = seat.status === "booked" || seat.status === "held_by_other";

                      return (
                        <button
                          key={seat.seat_id}
                          type="button"
                          className={`${styles.seat} ${seatClass}`}
                          onClick={() => toggleSeat(seat)}
                          disabled={isBlocked}
                          aria-label={`Row ${seat.row} Seat ${seat.number} — ${isSelected ? "selected" : seat.status}`}
                          aria-pressed={isSelected}
                        >
                          {String(seat.number).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        ))}

        {/* Screen */}
        <div className={styles.screenWrapper} aria-hidden="true">
          <div className={styles.screenCurve} />
          <p className={styles.screenLabel}>All eyes this way please</p>
        </div>

        {/* Legend */}
        <div className={styles.legend} role="list" aria-label="Seat status legend">
          {[
            { label: "Available", cls: "seat_available" },
            { label: "Selected",  cls: "seat_selected" },
            { label: "Held / In Progress", cls: "seat_held_by_other" },
            { label: "Booked",    cls: "seat_booked" },
          ].map(({ label, cls }) => (
            <div key={label} className={styles.legendItem} role="listitem">
              <span className={`${styles.legendSwatch} ${styles[cls]}`} aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom pay bar ────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className={styles.payBar}>
          <div className={styles.payBarInfo}>
            <span className={styles.payBarSeats}>
              {selectedSeatsList.map((s) => s.label || `${s.row}${s.number}`).join(", ")}
            </span>
            <span className={styles.payBarTotal}>₹{totalPrice}</span>
          </div>
          <button
            type="button"
            className={styles.payBtn}
            disabled={isHolding}
            onClick={handleContinue}
          >
            {isHolding ? "Reserving..." : "Pay Now →"}
          </button>
        </div>
      )}

      {/* ── How many seats modal ──────────────────────────────────────────── */}
      {showModal && (
        <SeatCountModal tiers={tiers} onConfirm={handleModalConfirm} />
      )}
    </div>
  );
}
