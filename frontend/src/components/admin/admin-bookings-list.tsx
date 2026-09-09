"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { adminBookingsApi, type AdminBookingSummary } from "./admin-api";
import styles from "./admin.module.css";

function formatDT(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
];

const PAGE_SIZE = 25;

export function AdminBookingsList() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<AdminBookingSummary[] | null>(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState("");
  const [error, setError]       = useState("");

  const load = (pg = page, st = status) => {
    if (!session) return;
    setBookings(null);
    setError("");
    adminBookingsApi
      .list(session.accessToken, { page: pg, page_size: PAGE_SIZE, status: st || undefined })
      .then((d) => { setBookings(d.items); setTotal(d.total); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load bookings"));
  };

  // reload when session, page or status changes
  useEffect(() => { load(); }, [session, page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (v: string) => {
    setStatus(v);
    setPage(1);
    load(1, v);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bookings</h1>
          <p className={styles.pageSubtitle}>
            All customer bookings — {total > 0 ? `${total} total` : "read-only view"}
          </p>
        </div>
        {/* filter */}
        <select
          className={styles.formSelect}
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{ minWidth: 150 }}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {!bookings && !error && <div className={styles.loading}>Loading bookings…</div>}

      {bookings && bookings.length === 0 && (
        <div className={styles.emptyState}>No bookings match the current filter.</div>
      )}

      {bookings && bookings.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Show time</th>
                  <th>Venue</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Booked at</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.booking_id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                      {b.booking_id.slice(0, 8)}…
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.user_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{b.user_email}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.event_title}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDT(b.start_time)}</td>
                    <td>{b.venue_name}</td>
                    <td style={{ textAlign: "center" }}>{b.seat_count}</td>
                    <td style={{ fontWeight: 600 }}>₹{parseFloat(b.total_amount).toFixed(2)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#666" }}>
                      {formatDT(b.created_at)}
                    </td>
                    <td>
                      <Link href={`/admin/bookings/${b.booking_id}`} className={styles.btnSecondary}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 13, color: "#555" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
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
      fontSize: 11,
      fontWeight: 600,
      background: color.bg,
      color: color.text,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}
