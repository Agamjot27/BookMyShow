"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Calendar,
  Armchair,
  FilmSlate,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import { fetchBookingTicket, type BookingTicket } from "./bookings-api";
import styles from "./ticket.module.css";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatINR(amount: string) {
  const n = parseFloat(amount);
  return isNaN(n) ? `₹${amount}` : `₹${n.toFixed(2)}`;
}

export function TicketPage({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [ticket, setTicket] = useState<BookingTicket | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!session) return;
    let active = true;
    setTicket(null);
    setError("");
    fetchBookingTicket(bookingId, session.accessToken)
      .then((data) => { if (active) setTicket(data); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load ticket");
      });
    return () => { active = false; };
  }, [bookingId, session, loading]);

  if (loading || (!ticket && !error)) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <p>{loading ? "Verifying session…" : "Loading ticket…"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={18} weight="bold" />
          <span>Back</span>
        </button>
        <div className={styles.errorState}>
          <WarningCircle size={40} className={styles.errorIcon} />
          <p>{error}</p>
          <button type="button" className={styles.secondaryBtn} onClick={() => router.push("/bookings")}>
            View all bookings
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const totalAmount = parseFloat(ticket.total_amount);
  const perSeat = ticket.seats.length > 0 ? parseFloat(ticket.seats[0].price) : 0;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={18} weight="bold" />
          <span>My Bookings</span>
        </button>
        <h1 className={styles.pageTitle}>Booking Details</h1>
      </header>

      <div className={styles.layout}>
        {/* ── Ticket card ── */}
        <div className={styles.ticketCard}>
          {/* Top strip */}
          <div className={styles.ticketTop}>
            <div className={styles.ticketPoster}>
              <FilmSlate size={32} className={styles.posterIcon} />
            </div>
            <div className={styles.ticketTopInfo}>
              <h2 className={styles.eventTitle}>{ticket.event.title}</h2>
              <span className={styles.confirmedBadge}>
                <CheckCircle size={14} weight="fill" />
                Confirmed
              </span>
            </div>
          </div>

          {/* Divider with circles */}
          <div className={styles.ticketDivider}>
            <div className={styles.dividerCircleLeft} />
            <div className={styles.dividerLine} />
            <div className={styles.dividerCircleRight} />
          </div>

          {/* Details grid */}
          <div className={styles.ticketDetails}>
            <div className={styles.detailItem}>
              <Calendar size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Show Time</span>
                <span className={styles.detailValue}>{formatDateTime(ticket.start_time)}</span>
              </div>
            </div>

            <div className={styles.detailItem}>
              <MapPin size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Venue</span>
                <span className={styles.detailValue}>{ticket.venue.name}</span>
                {ticket.venue.address && (
                  <span className={styles.detailSub}>{ticket.venue.address}</span>
                )}
              </div>
            </div>

            <div className={styles.detailItem}>
              <Armchair size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>
                  Screen · {ticket.screen.name}
                </span>
                <span className={styles.detailValue}>
                  {ticket.seats.map((s) => s.label).join(", ")}
                </span>
                <span className={styles.detailSub}>
                  {ticket.seats.length} seat{ticket.seats.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className={styles.ticketDivider}>
            <div className={styles.dividerCircleLeft} />
            <div className={styles.dividerLine} />
            <div className={styles.dividerCircleRight} />
          </div>

          {/* Price breakdown */}
          <div className={styles.priceSection}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>
                Ticket × {ticket.seats.length}
              </span>
              <span className={styles.priceValue}>{formatINR(String(perSeat * ticket.seats.length))}</span>
            </div>
            <div className={`${styles.priceRow} ${styles.priceRowTotal}`}>
              <span className={styles.priceLabel}>Total Paid</span>
              <span className={styles.priceTotalValue}>{formatINR(ticket.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* ── Booking meta ── */}
        <div className={styles.metaCard}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Booking ID</span>
            <span className={styles.metaValue}>{ticket.booking_id}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Booked On</span>
            <span className={styles.metaValue}>{formatDateTime(ticket.created_at)}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Status</span>
            <span className={styles.metaValue}>{ticket.status}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Currency</span>
            <span className={styles.metaValue}>{ticket.currency}</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => router.push("/bookings")}
        >
          ← Back to My Bookings
        </button>
      </div>
    </div>
  );
}
