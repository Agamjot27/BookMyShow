"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Wheelchair } from "@phosphor-icons/react";
import styles from "./seat-layout.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeatStatus = "available" | "sold" | "bestseller" | "selected";

interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  tier: string;
}

interface Tier {
  label: string;   // e.g. "₹350 GOLD"
  price: number;
  rows: string[];
}

// ---------------------------------------------------------------------------
// Static seat layout data (mirrors the seeded screens)
// ---------------------------------------------------------------------------

const TIERS: Tier[] = [
  { label: "RECLINER", price: 400, rows: ["A", "B"] },
  { label: "GOLD",     price: 350, rows: ["C", "D", "E", "F", "G"] },
  { label: "SILVER",   price: 200, rows: ["H", "I", "J"] },
];

const SEATS_PER_ROW = 12;

// Deterministically mark a few seats as sold / bestseller for visual variety
function buildSeats(): Seat[] {
  const sold = new Set(["A-3", "B-7", "C-5", "C-6", "D-9", "E-2", "F-11", "G-4", "H-8", "I-1", "J-10"]);
  const best = new Set(["C-7", "C-8", "D-6", "D-7", "E-6", "E-7", "F-6", "F-7"]);

  const seats: Seat[] = [];
  for (const tier of TIERS) {
    for (const row of tier.rows) {
      for (let n = 1; n <= SEATS_PER_ROW; n++) {
        const key = `${row}-${n}`;
        let status: SeatStatus = "available";
        if (sold.has(key)) status = "sold";
        else if (best.has(key)) status = "bestseller";
        seats.push({ id: key, row, number: n, status, tier: tier.label });
      }
    }
  }
  return seats;
}

const ALL_SEATS = buildSeats();

// ---------------------------------------------------------------------------
// How Many Seats Modal — animated bottom sheet
// ---------------------------------------------------------------------------

function SeatCountModal({
  tiers,
  onConfirm,
}: {
  tiers: Tier[];
  onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState(2);
  // "closing" drives the slide-down + fade-out before unmounting
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    setClosing(true);
  }, []);

  // After the exit animation finishes, call onConfirm to actually unmount
  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (closing && e.animationName.includes("slideDown")) {
        onConfirm(count);
      }
    },
    [closing, count, onConfirm],
  );

  // Keyboard: Escape closes
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
      onClick={dismiss}           // click outside (backdrop) to close
      role="presentation"
    >
      <div
        className={`${styles.modal} ${closing ? styles.sheetOut : styles.sheetIn}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()} // don't close when clicking inside
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Drag handle */}
        <div className={styles.sheetHandle} aria-hidden="true" />

        <h2 id="modal-title" className={styles.modalTitle}>How many seats?</h2>

        {/* Scooter illustration */}
        <div className={styles.modalIllustration} aria-hidden="true">🛵</div>

        {/* Seat count picker */}
        <div className={styles.countRow} role="group" aria-label="Select number of seats">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
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

        {/* Tier pricing */}
        <div className={styles.tierPricing}>
          {tiers.map((t) => (
            <div key={t.label} className={styles.tierPriceCol}>
              <span className={styles.tierName}>{t.label}</span>
              <span className={styles.tierPrice}>₹{t.price}</span>
              <span className={styles.tierAvail}>AVAILABLE</span>
            </div>
          ))}
        </div>

        <p className={styles.bestsellerNote}>
          Book the <span className={styles.bestsellerSwatch} aria-label="bestseller colour" />{" "}
          <strong>Bestseller Seats</strong> in this cinema at no extra cost!
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
// Main component
// ---------------------------------------------------------------------------

export function SeatLayoutPage() {
  const router = useRouter();
  const params = useSearchParams();

  const movieTitle   = params.get("movie")   ?? "Movie";
  const theatreName  = params.get("theatre") ?? "Theatre";
  const showDate     = params.get("date")    ?? "";
  const showTime     = params.get("time")    ?? "";
  const showLabel    = params.get("label")   ?? "";
  const locationSlug = params.get("location") ?? "";
  const movieId      = params.get("movieId") ?? "";

  // All show times at this theatre (passed as comma-separated "time|label" pairs)
  const rawTimes = params.get("times") ?? "";
  const otherTimes: { time: string; label: string }[] = rawTimes
    ? rawTimes.split(",").map((t) => {
        const [time, label = ""] = t.split("|");
        return { time, label };
      })
    : [{ time: showTime, label: showLabel }];

  // State
  const [showModal, setShowModal] = useState(true);
  const [maxSeats, setMaxSeats] = useState(2);
  const [seats, setSeats] = useState<Seat[]>(ALL_SEATS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [capped, setCapped] = useState(false); // true briefly when user tries to exceed max

  const handleModalConfirm = useCallback((count: number) => {
    setMaxSeats(count);
    setShowModal(false);
  }, []);

  const toggleSeat = useCallback((seat: Seat) => {
    if (seat.status === "sold") return;

    const isSelected = seat.status === "selected";

    // Block selecting more seats than the chosen count — flash a cap indicator
    if (!isSelected && selectedIds.size >= maxSeats) {
      setCapped(true);
      setTimeout(() => setCapped(false), 800);
      return;
    }

    const originalStatus = ALL_SEATS.find((o) => o.id === seat.id)?.status ?? "available";
    const nextStatus: SeatStatus = isSelected ? originalStatus : "selected";

    setSeats((prev) =>
      prev.map((s) => (s.id === seat.id ? { ...s, status: nextStatus } : s)),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }, [maxSeats, selectedIds]);

  const selectedSeats = seats.filter((s) => s.status === "selected");
  const totalPrice = selectedSeats.reduce((sum, s) => {
    const tier = TIERS.find((t) => t.label === s.tier);
    return sum + (tier?.price ?? 0);
  }, 0);

  const handleTimeSwitch = (time: string, label: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("time", time);
    url.searchParams.set("label", label);
    router.replace(url.pathname + url.search);
    // Reset selections when switching show time
    setSeats(ALL_SEATS);
    setSelectedIds(new Set());
    setShowModal(true);
  };

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
          <span className={styles.topBarTitle}>{movieTitle}</span>
          <span className={styles.topBarSub}>
            {theatreName}{showDate ? ` | ${showDate}` : ""}{showTime ? ` | ${showTime}` : ""}
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
      <div className={styles.timeSwitcher} role="group" aria-label="Available showtimes">
        {otherTimes.map((t) => {
          const active = t.time === showTime;
          return (
            <button
              key={t.time}
              type="button"
              className={`${styles.timePill} ${active ? styles.timePillActive : ""}`}
              onClick={() => !active && handleTimeSwitch(t.time, t.label)}
              aria-pressed={active}
            >
              <span className={styles.timePillTime}>{t.time}</span>
              {t.label && <span className={styles.timePillLabel}>{t.label}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Seat grid ─────────────────────────────────────────────────────── */}
      <div className={styles.seatArea}>

        {/* Cap warning toast */}
        {capped && (
          <div className={styles.capToast} role="alert" aria-live="assertive">
            You can only select {maxSeats} seat{maxSeats > 1 ? "s" : ""}. Deselect one to change your pick.
          </div>
        )}
        {TIERS.map((tier) => (
          <section key={tier.label} className={styles.tierSection} aria-label={`${tier.label} section`}>
            <div className={styles.tierHeader}>₹{tier.price} {tier.label}</div>

            {tier.rows.map((row) => {
              const rowSeats = seats.filter((s) => s.row === row);
              return (
                <div key={row} className={styles.seatRow}>
                  <span className={styles.rowLabel} aria-label={`Row ${row}`}>{row}</span>
                  <div className={styles.seatGroup}>
                    {rowSeats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        className={`${styles.seat} ${styles[`seat_${seat.status}`]}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status === "sold"}
                        aria-label={`Row ${seat.row} Seat ${seat.number} — ${seat.status}`}
                        aria-pressed={seat.status === "selected"}
                      >
                        {String(seat.number).padStart(2, "0")}
                      </button>
                    ))}
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
            { label: "Sold",      cls: "seat_sold" },
            { label: "Bestseller",cls: "seat_bestseller" },
            { label: "Selected",  cls: "seat_selected" },
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
              {selectedSeats.map((s) => `${s.row}${s.number}`).join(", ")}
            </span>
            <span className={styles.payBarTotal}>₹{totalPrice}</span>
          </div>
          <button
            type="button"
            className={styles.payBtn}
            onClick={() => {
              const p = new URLSearchParams({
                movie:   movieTitle,
                seats:   selectedSeats.map((s) => `${s.row}${s.number}`).join(","),
                total:   String(totalPrice),
                theatre: theatreName,
                date:    showDate,
                time:    showTime,
                tier:    selectedSeats[0]?.tier ?? "",
                type:    "movie",
                location: locationSlug,
                movieId,
              });
              router.push(`/checkout?${p.toString()}`);
            }}
          >
            Pay Now →
          </button>
        </div>
      )}

      {/* ── How many seats modal ──────────────────────────────────────────── */}
      {showModal && (
        <SeatCountModal tiers={TIERS} onConfirm={handleModalConfirm} />
      )}
    </div>
  );
}
