"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { screensApi, venuesApi, layoutApi, type Screen, type Venue, type SeatInput } from "./admin-api";
import styles from "./admin.module.css";

const SEAT_TYPES  = ["standard", "premium", "recliner", "wheelchair"] as const;
const PRICE_TIERS = ["base", "premium", "vip"] as const;

interface RowConfig {
  row: string;
  from: number;
  to: number;
  seat_type: (typeof SEAT_TYPES)[number];
  price_tier: (typeof PRICE_TIERS)[number];
}

function buildSeats(rows: RowConfig[]): SeatInput[] {
  const seats: SeatInput[] = [];
  for (const r of rows) {
    const lo = Math.min(r.from, r.to);
    const hi = Math.max(r.from, r.to);
    for (let n = lo; n <= hi; n++) {
      seats.push({ row: r.row.toUpperCase(), number: n, seat_type: r.seat_type, price_tier: r.price_tier });
    }
  }
  return seats;
}

function hasDuplicates(seats: SeatInput[]): boolean {
  const seen = new Set<string>();
  for (const s of seats) {
    const key = `${s.row}:${s.number}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function LayoutBuilder({ screenId }: { screenId: string }) {
  const { session } = useAuth();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [venue, setVenue]   = useState<Venue | null>(null);
  const [loadError, setLoadError] = useState("");

  const [rows, setRows] = useState<RowConfig[]>([
    { row: "A", from: 1, to: 10, seat_type: "standard", price_tier: "base" },
  ]);

  const [busy, setBusy]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    if (!session) return;
    screensApi.get(screenId, session.accessToken)
      .then(async (s) => {
        setScreen(s);
        const v = await venuesApi.get(s.venue_id, session.accessToken);
        setVenue(v);
        // Load existing layout as seed
        const existing = await layoutApi.get(screenId, session.accessToken);
        if (existing.length > 0) {
          // Collapse existing seats into row configs for editing
          const byRow = new Map<string, { minN: number; maxN: number; seat_type: string; price_tier: string }>();
          for (const seat of existing) {
            const e = byRow.get(seat.row);
            if (!e) {
              byRow.set(seat.row, { minN: seat.number, maxN: seat.number, seat_type: seat.seat_type, price_tier: seat.price_tier });
            } else {
              e.minN = Math.min(e.minN, seat.number);
              e.maxN = Math.max(e.maxN, seat.number);
            }
          }
          setRows(
            Array.from(byRow.entries()).map(([row, v]) => ({
              row,
              from: v.minN,
              to: v.maxN,
              seat_type: v.seat_type as (typeof SEAT_TYPES)[number],
              price_tier: v.price_tier as (typeof PRICE_TIERS)[number],
            })),
          );
        }
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to load screen"));
  }, [session, screenId]);

  const updateRow = (i: number, patch: Partial<RowConfig>) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    // Suggest the next letter
    const nextLetter = lastRow
      ? String.fromCharCode(lastRow.row.charCodeAt(0) + 1)
      : "A";
    setRows((prev) => [
      ...prev,
      { row: nextLetter, from: 1, to: lastRow?.to ?? 10, seat_type: "standard", price_tier: "base" },
    ]);
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const preview = buildSeats(rows);
  const duplicated = hasDuplicates(preview);

  const validate = (): string => {
    if (rows.length === 0) return "Add at least one row.";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.row.trim() || !/^[A-Za-z]+$/.test(r.row)) return `Row ${i + 1}: Row label must be letters only.`;
      if (!Number.isInteger(r.from) || r.from < 1) return `Row ${i + 1}: "From" must be a positive integer.`;
      if (!Number.isInteger(r.to)   || r.to < 1)   return `Row ${i + 1}: "To" must be a positive integer.`;
    }
    if (duplicated) return "Duplicate seat positions detected. Fix overlapping rows.";
    if (preview.length > 2000) return "Cannot configure more than 2000 seats at once.";
    return "";
  };

  const handleSave = async () => {
    if (!session) return;
    const err = validate();
    if (err) { setSaveError(err); return; }
    setBusy(true);
    setSaveError("");
    setSaved(false);
    try {
      await layoutApi.put(screenId, preview, session.accessToken);
      setSaved(true);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <div className={styles.page}><div className={styles.alertError}>{loadError}</div></div>;
  if (!screen)   return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/venues">Venues</Link>
        {venue && (
          <>
            <span className={styles.breadcrumbSep}>›</span>
            <Link href={`/admin/venues/${venue.venue_id}`}>{venue.name}</Link>
          </>
        )}
        <span className={styles.breadcrumbSep}>›</span>
        <Link href={`/admin/screens/${screenId}`}>{screen.name}</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>Layout</span>
      </nav>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Configure Seat Layout</h1>
          <p className={styles.pageSubtitle}>{screen.name}</p>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <p className={styles.layoutHelp}>
          Define each row of seats. Every row generates seats from "From" to "To" (inclusive).
          Saving this layout <strong>replaces</strong> all existing seats for this screen.
          Seats already tied to confirmed bookings cannot be removed.
        </p>

        {/* Column headers */}
        <div className={styles.rowBuilderHeader}>
          <span>Row</span>
          <span>From → To</span>
          <span></span>
          <span>Type</span>
          <span>Tier</span>
          <span></span>
        </div>

        <div style={{ overflowX: "auto" }}>
          {rows.map((r, i) => (
            <div key={i} className={styles.rowBuilderRow}>
              <input
                type="text"
                className={styles.formInput}
                value={r.row}
                maxLength={5}
                placeholder="A"
                aria-label={`Row ${i + 1} label`}
                onChange={(e) => updateRow(i, { row: e.target.value.toUpperCase() })}
              />
              <input
                type="number"
                className={styles.formInput}
                value={r.from}
                min={1}
                max={999}
                aria-label={`Row ${i + 1} from seat number`}
                onChange={(e) => updateRow(i, { from: parseInt(e.target.value, 10) || 1 })}
              />
              <input
                type="number"
                className={styles.formInput}
                value={r.to}
                min={1}
                max={999}
                aria-label={`Row ${i + 1} to seat number`}
                onChange={(e) => updateRow(i, { to: parseInt(e.target.value, 10) || 1 })}
              />
              <select
                className={styles.formSelect}
                value={r.seat_type}
                aria-label={`Row ${i + 1} seat type`}
                onChange={(e) => updateRow(i, { seat_type: e.target.value as (typeof SEAT_TYPES)[number] })}
              >
                {SEAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                className={styles.formSelect}
                value={r.price_tier}
                aria-label={`Row ${i + 1} price tier`}
                onChange={(e) => updateRow(i, { price_tier: e.target.value as (typeof PRICE_TIERS)[number] })}
              >
                {PRICE_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                type="button"
                className={styles.removeRowBtn}
                onClick={() => removeRow(i)}
                aria-label={`Remove row ${r.row}`}
                title="Remove row"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className={styles.formActions} style={{ marginTop: 12 }}>
          <button type="button" className={styles.btnSecondary} onClick={addRow}>+ Add Row</button>
        </div>

        {/* Live preview */}
        {preview.length > 0 && !duplicated && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Preview — {preview.length} seat{preview.length !== 1 ? "s" : ""}
              {preview.length > 100 ? " (showing first 100)" : ""}
            </p>
            <div className={styles.previewGrid}>
              {preview.slice(0, 100).map((s, i) => (
                <div
                  key={i}
                  className={`${styles.previewSeat} ${
                    s.price_tier === "premium" ? styles.previewSeatPremium :
                    s.price_tier === "vip" ? styles.previewSeatVip : ""
                  }`}
                  title={`${s.row}${s.number} · ${s.seat_type} · ${s.price_tier}`}
                >
                  {s.row}{s.number}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#888" }}>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#a31540", borderRadius: 2, marginRight: 4 }} />base</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#f59e0b", borderRadius: 2, marginRight: 4 }} />premium</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#7c3aed", borderRadius: 2, marginRight: 4 }} />vip</span>
            </div>
          </div>
        )}

        {duplicated && (
          <div className={styles.alertError} style={{ marginTop: 12 }}>
            Duplicate seat positions detected. Check for overlapping row ranges.
          </div>
        )}

        {saveError && <div className={styles.alertError} style={{ marginTop: 12 }}>{saveError}</div>}
        {saved && <div className={styles.alertSuccess} style={{ marginTop: 12 }}>Layout saved — {preview.length} seats configured.</div>}

        <div className={styles.formActions} style={{ marginTop: 16 }}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={busy || rows.length === 0}
          >
            {busy ? "Saving…" : "Save Layout"}
          </button>
          <Link href={`/admin/screens/${screenId}`} className={styles.btnSecondary}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
