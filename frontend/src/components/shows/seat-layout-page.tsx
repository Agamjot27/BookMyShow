"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import { ArrowLeft, Wheelchair } from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import { saveCheckoutSession } from "@/components/checkout/booking-session";
import styles from "./seat-layout.module.css";

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showModal, setShowModal] = useState(true);
  const [maxSeats, setMaxSeats] = useState(2);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [capped, setCapped] = useState(false);
  const [holdError, setHoldError] = useState("");
  const [isHolding, setIsHolding] = useState(false);

  // Load show details and seats map
  const loadShowData = useCallback(async () => {
    if (!showId) return;
    try {
      setLoading(true);
      setLoadError("");

      const headers: Record<string, string> = {};
      if (session?.accessToken) {
        headers["Authorization"] = `Bearer ${session.accessToken}`;
      }

      // Fetch show info and seat map in parallel
      const [showRes, seatsRes] = await Promise.all([
        fetch(`/api/shows/${showId}`, { cache: "no-store" }),
        fetch(`/api/shows/${showId}/seats`, { headers, cache: "no-store" }),
      ]);

      if (!showRes.ok) {
        if (showRes.status === 404) throw new Error("Show not found or no longer active.");
        throw new Error("Could not load show information.");
      }

      if (!seatsRes.ok) {
        if (seatsRes.status === 404) throw new Error("Seat layout not found for this show.");
        throw new Error("Could not load seat layout.");
      }

      const showData = (await showRes.json()) as ShowDetails;
      const seatsData = (await seatsRes.json()) as { seats: BackendSeat[] };

      setShow(showData);
      setSeats(seatsData.seats || []);

      // If any currently selected seats are no longer available, remove them
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const availableSeatIds = new Set(
          (seatsData.seats || [])
            .filter((s) => s.status === "available" || s.status === "held_by_me")
            .map((s) => s.seat_id),
        );
        const next = new Set<string>();
        prev.forEach((id) => {
          if (availableSeatIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load show details.");
    } finally {
      setLoading(false);
    }
  }, [showId, session?.accessToken]);

  // Initial load
  useEffect(() => {
    loadShowData();
  }, [loadShowData]);

  // Dynamic layout tiers based on backend seat data
  const tiers: TierInfo[] = useMemo(() => {
    if (!seats || seats.length === 0) return [];

    const rowMap = new Map<string, string>();
    seats.forEach((s) => {
      if (!rowMap.has(s.row)) {
        rowMap.set(s.row, s.seat_type || "standard");
      }
    });

    const basePrice = Number(show?.base_price ?? 250);

    const typeToRows = new Map<string, string[]>();
    rowMap.forEach((type, row) => {
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
        result.push({
          tierKey: t,
          label: t.toUpperCase(),
          price: basePrice,
          rows,
        });
      }
    });

    typeToRows.forEach((rows, t) => {
      if (!order.includes(t)) {
        rows.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        result.push({
          tierKey: t,
          label: t.toUpperCase(),
          price: basePrice,
          rows,
        });
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
    if (selectedIds.size === 0 || isHolding) return;

    if (!session) {
      openAuthModal();
      return;
    }

    setIsHolding(true);
    setHoldError("");

    try {
      const seatIds = Array.from(selectedIds);
      const res = await fetch(`/api/shows/${showId}/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ seat_ids: seatIds }),
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
        await loadShowData();
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
    } catch {
      setHoldError("Network error while reserving seats. Please try again.");
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

              return (
                <div key={row} className={styles.seatRow}>
                  <span className={styles.rowLabel} aria-label={`Row ${row}`}>
                    {row}
                  </span>
                  <div className={styles.seatGroup}>
                    {rowSeats.map((seat) => {
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
