"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Armchair, FilmSlate, ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import { fetchMyBookings, type BookingSummary } from "@/components/bookings/bookings-api";
import styles from "./profile.module.css";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
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

export function OrderHistory() {
  const router = useRouter();
  const { session } = useAuth();
  const [bookings, setBookings] = useState<BookingSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    let active = true;
    setBookings(null);
    setError("");
    fetchMyBookings(session.accessToken)
      .then((data) => { if (active) setBookings(data); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load bookings");
      });
    return () => { active = false; };
  }, [session]);

  if (!session) {
    return (
      <div className={styles.ordersWrapper}>
        <h1 className={styles.ordersMainHeading}>Your Orders</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Sign in to view your booking history.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.ordersWrapper}>
        <h1 className={styles.ordersMainHeading}>Your Orders</h1>
        <div className={styles.ordersEmpty}>
          <WarningCircle size={36} className={styles.ordersEmptyIcon} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!bookings) {
    return (
      <div className={styles.ordersWrapper}>
        <h1 className={styles.ordersMainHeading}>Your Orders</h1>
        <p style={{ color: "#888", fontSize: 14 }}>Loading your bookings…</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className={styles.ordersWrapper}>
        <h1 className={styles.ordersMainHeading}>Your Orders</h1>
        <div className={styles.ordersEmpty}>
          <FilmSlate size={40} className={styles.ordersEmptyIcon} />
          <p>No bookings yet. Book your first show!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.ordersWrapper}>
      <h1 className={styles.ordersMainHeading}>Your Orders</h1>

      {bookings.map((booking) => (
        <article
          key={booking.booking_id}
          className={`${styles.orderCard} ${styles.orderCardClickable}`}
          onClick={() => router.push(`/bookings/${booking.booking_id}`)}
          role="button"
          tabIndex={0}
          aria-label={`View ticket for ${booking.event_title}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.push(`/bookings/${booking.booking_id}`);
          }}
        >
          {/* Main Card Body */}
          <div className={styles.orderBody}>
            {/* Poster Thumbnail */}
            <div className={styles.orderPoster}>
              <FilmSlate className={styles.orderPosterIcon} />
              <span className={styles.orderPosterTitle}>{booking.event_title}</span>
            </div>

            {/* Center Info */}
            <div className={styles.orderCenter}>
              <h2 className={styles.orderMovieTitle}>{booking.event_title}</h2>

              <p className={styles.orderVenueTime}>
                {formatDateTime(booking.start_time)} — {booking.venue_name}
              </p>

              <div className={styles.orderSeatsRow}>
                <Armchair className={styles.couchIcon} weight="fill" />
                <span>
                  {booking.seat_count} seat{booking.seat_count !== 1 ? "s" : ""}
                </span>
              </div>

              <span
                className={
                  booking.status === "confirmed" ? styles.statusBadgeConfirmed : styles.statusBadge
                }
              >
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>

            {/* Right Pricing */}
            <div className={styles.orderRight}>
              <span className={styles.totalPrice}>{formatINR(booking.total_amount)}</span>
              <ArrowRight size={18} className={styles.orderArrow} />
            </div>
          </div>

          {/* Bottom Footer */}
          <div className={styles.orderFooter}>
            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Booking Date &amp; Time</span>
              <span className={styles.footerValue}>{formatDateTime(booking.created_at)}</span>
            </div>

            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Booking ID</span>
              <span className={styles.footerValue}>{booking.booking_id}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
