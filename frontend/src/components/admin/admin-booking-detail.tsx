"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { adminBookingsApi, type AdminBookingDetail } from "./admin-api";
import styles from "./admin.module.css";

function formatDT(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "confirmed" ? { bg: "#dcfce7", text: "#166534" } :
    status === "cancelled" ? { bg: "#fee2e2", text: "#991b1b" } :
    { bg: "#f4f4f7", text: "#444" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: color.bg,
      color: color.text,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}

export function AdminBookingDetail({ bookingId }: { bookingId: string }) {
  const { session } = useAuth();
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!session) return;
    adminBookingsApi
      .get(bookingId, session.accessToken)
      .then(setBooking)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load booking"));
  }, [session, bookingId]);

  return (
    <div className={styles.page}>
      {/* breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/admin">Dashboard</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href="/admin/bookings">Bookings</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{bookingId.slice(0, 8)}…</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Booking Detail</h1>
          <p className={styles.pageSubtitle} style={{ fontFamily: "monospace", fontSize: 12 }}>
            {bookingId}
          </p>
        </div>
        {booking && <StatusBadge status={booking.status} />}
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {!booking && !error && <div className={styles.loading}>Loading booking…</div>}

      {booking && (
        <>
          {/* Summary card */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionCardTitle}>Summary</h2>
            <div className={styles.kvGrid}>
              <span className={styles.kvLabel}>Booking ID</span>
              <span className={styles.kvValue} style={{ fontFamily: "monospace", fontSize: 12 }}>{booking.booking_id}</span>

              <span className={styles.kvLabel}>Status</span>
              <span className={styles.kvValue}><StatusBadge status={booking.status} /></span>

              <span className={styles.kvLabel}>Total Amount</span>
              <span className={styles.kvValue} style={{ fontSize: 16 }}>
                ₹{parseFloat(booking.total_amount).toFixed(2)}{" "}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#666" }}>{booking.currency}</span>
              </span>

              <span className={styles.kvLabel}>Booked At</span>
              <span className={styles.kvValue}>{formatDT(booking.created_at)}</span>
            </div>
          </div>

          {/* Customer */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionCardTitle}>Customer</h2>
            <div className={styles.kvGrid}>
              <span className={styles.kvLabel}>Name</span>
              <span className={styles.kvValue}>{booking.user.name || "—"}</span>

              <span className={styles.kvLabel}>Email</span>
              <span className={styles.kvValue}>{booking.user.email}</span>

              <span className={styles.kvLabel}>User ID</span>
              <span className={styles.kvValue} style={{ fontFamily: "monospace", fontSize: 12 }}>
                {booking.user.user_id}
              </span>
            </div>
          </div>

          {/* Show details */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionCardTitle}>Show Details</h2>
            <div className={styles.kvGrid}>
              <span className={styles.kvLabel}>Event</span>
              <span className={styles.kvValue}>{booking.event.title}</span>

              <span className={styles.kvLabel}>Venue</span>
              <span className={styles.kvValue}>{booking.venue.name}</span>

              <span className={styles.kvLabel}>Address</span>
              <span className={styles.kvValue}>{booking.venue.address}</span>

              <span className={styles.kvLabel}>Screen</span>
              <span className={styles.kvValue}>{booking.screen.name}</span>

              <span className={styles.kvLabel}>Start Time</span>
              <span className={styles.kvValue}>{formatDT(booking.start_time)}</span>

              <span className={styles.kvLabel}>End Time</span>
              <span className={styles.kvValue}>{formatDT(booking.end_time)}</span>
            </div>
          </div>

          {/* Seats */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionCardTitle}>
              Seats ({booking.seats?.length ?? 0})
            </h2>
            {(!booking.seats || booking.seats.length === 0) ? (
              <p style={{ color: "#888", fontSize: 13 }}>No seat data.</p>
            ) : (
              <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Row</th>
                      <th>Number</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.seats.map((seat) => (
                      <tr key={seat.seat_id}>
                        <td style={{ fontWeight: 700 }}>{seat.label}</td>
                        <td>{seat.row}</td>
                        <td>{seat.number}</td>
                        <td>₹{parseFloat(seat.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
