"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { analyticsApi, type AnalyticsDashboard } from "./admin-api";
import styles from "./admin.module.css";

function formatDT(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function SummaryCard({
  label, value, sub,
}: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e5e8",
      borderRadius: 12,
      padding: "20px 24px",
      minWidth: 180,
      flex: "1 1 180px",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function AdminDashboard() {
  const { session } = useAuth();
  const [data, setData]   = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    analyticsApi
      .getDashboard(session.accessToken)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, [session]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Live metrics from confirmed bookings</p>
        </div>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {!data && !error && <div className={styles.loading}>Loading analytics…</div>}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <SummaryCard
              label="Confirmed Bookings"
              value={data.summary.total_bookings.toLocaleString()}
            />
            <SummaryCard
              label="Total Revenue"
              value={`₹${parseFloat(data.summary.total_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="from confirmed bookings"
            />
            <SummaryCard
              label="Upcoming Shows"
              value={data.summary.upcoming_shows.toLocaleString()}
              sub="starting in the future"
            />
            <SummaryCard
              label="Avg Occupancy"
              value={`${data.summary.avg_occupancy_pct}%`}
              sub="across all shows"
            />
          </div>

          {/* Revenue by event */}
          {data.revenue_by_event.length > 0 && (
            <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
              <h2 className={styles.sectionCardTitle}>Revenue by Event</h2>
              <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Tickets Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenue_by_event.map((ev) => (
                      <tr key={ev.event_id}>
                        <td style={{ fontWeight: 600 }}>{ev.event_title}</td>
                        <td>{ev.tickets_sold.toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>
                          ₹{parseFloat(ev.revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Show occupancy */}
          {data.occupancy.length > 0 && (
            <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
              <h2 className={styles.sectionCardTitle}>Show Occupancy</h2>
              <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Venue / Screen</th>
                      <th>Start Time</th>
                      <th>Seats Sold</th>
                      <th>Total Seats</th>
                      <th>Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.occupancy.map((row) => (
                      <tr key={row.show_id}>
                        <td style={{ fontWeight: 500 }}>{row.event_title}</td>
                        <td>{row.venue_name} — {row.screen_name}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDT(row.start_time)}</td>
                        <td>{row.seats_sold}</td>
                        <td>{row.seats_total}</td>
                        <td>
                          <OccupancyBar pct={row.occupancy_pct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent bookings */}
          {data.recent_bookings.length > 0 && (
            <div className={styles.sectionCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 className={styles.sectionCardTitle} style={{ margin: 0 }}>Recent Bookings</h2>
                <Link href="/admin/bookings" className={styles.btnSecondary} style={{ fontSize: 12 }}>
                  View all →
                </Link>
              </div>
              <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Event</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Booked At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_bookings.map((b) => (
                      <tr key={b.booking_id}>
                        <td>{b.user_email}</td>
                        <td style={{ fontWeight: 500 }}>{b.event_title}</td>
                        <td style={{ fontWeight: 600 }}>
                          ₹{parseFloat(b.total_amount).toFixed(2)}
                        </td>
                        <td>
                          <span style={{
                            display: "inline-block", padding: "2px 10px", borderRadius: 20,
                            fontSize: 11, fontWeight: 600,
                            background: b.status === "confirmed" ? "#dcfce7" : "#f4f4f7",
                            color: b.status === "confirmed" ? "#166534" : "#444",
                            textTransform: "capitalize",
                          }}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap" }}>
                          {formatDT(b.created_at)}
                        </td>
                        <td>
                          <Link href={`/admin/bookings/${b.booking_id}`} className={styles.btnSecondary} style={{ fontSize: 12, padding: "5px 10px" }}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 80 ? "#16a34a" : clamped >= 50 ? "#d97706" : "#a31540";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 8, background: "#f0f0f3", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{pct}%</span>
    </div>
  );
}
