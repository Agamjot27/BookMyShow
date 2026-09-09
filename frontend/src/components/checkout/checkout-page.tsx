"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  QrCode,
  CreditCard,
  Wallet,
  Gift,
  Bank,
  Timer,
  Tag,
  CheckCircle,
  DeviceMobile,
  PiggyBank,
} from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import { CHECKOUT_KEY, RECEIPT_KEY, readCheckoutSession, type CheckoutSession } from "./booking-session";
import styles from "./checkout.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentMethod =
  | "upi"
  | "card"
  | "wallets"
  | "voucher"
  | "netbanking"
  | "paylater"
  | "points";

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------



function formatINR(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

// Derive event type from query param — "movie" | "standup" | "concert" | "other"
type EventType = "movie" | "standup" | "concert" | "other";

function resolveEventType(raw: string | null): EventType {
  if (!raw) return "other";
  const v = raw.toLowerCase();
  if (v === "movie") return "movie";
  if (v === "standup") return "standup";
  if (v === "concert") return "concert";
  return "other";
}

// ---------------------------------------------------------------------------
// Payment options panel content
// ---------------------------------------------------------------------------

function UpiPanel() {
  return (
    <div className={styles.methodContent}>
      <h3 className={styles.methodContentTitle}>Pay by any UPI App</h3>
      <button type="button" className={styles.upiRow}>
        <QrCode size={28} className={styles.upiQrIcon} />
        <div className={styles.upiRowText}>
          <span className={styles.upiRowLabel}>Scan QR code</span>
          <span className={styles.upiRowSub}>You need to have a registered UPI ID</span>
        </div>
        <ArrowLeft size={16} className={styles.upiArrow} />
      </button>
    </div>
  );
}

function CardPanel() {
  const [num, setNum]    = useState("");
  const [exp, setExp]    = useState("");
  const [cvv, setCvv]    = useState("");
  const [name, setName]  = useState("");

  return (
    <div className={styles.methodContent}>
      <h3 className={styles.methodContentTitle}>Debit / Credit Card</h3>
      <div className={styles.cardForm}>
        <label className={styles.cardLabel}>
          Card number
          <input
            className={styles.cardInput}
            type="text"
            inputMode="numeric"
            maxLength={19}
            placeholder="0000 0000 0000 0000"
            value={num}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
              setNum(raw.replace(/(.{4})/g, "$1 ").trim());
            }}
          />
        </label>
        <div className={styles.cardRow2}>
          <label className={styles.cardLabel}>
            Expiry (MM / YY)
            <input
              className={styles.cardInput}
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="MM / YY"
              value={exp}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                if (v.length > 2) v = v.slice(0, 2) + " / " + v.slice(2);
                setExp(v);
              }}
            />
          </label>
          <label className={styles.cardLabel}>
            CVV
            <input
              className={styles.cardInput}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="•••"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
        </div>
        <label className={styles.cardLabel}>
          Name on card
          <input
            className={styles.cardInput}
            type="text"
            placeholder="As printed on card"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function SimplePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className={styles.methodContent}>
      <h3 className={styles.methodContentTitle}>{title}</h3>
      <p className={styles.simplePanelMsg}>{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order summary — modular per event type
// ---------------------------------------------------------------------------

interface SummaryProps {
  eventType: EventType;
  title: string;
  venue: string;
  screen: string;
  dateTime: string;
  seats: string[];
  format: string;
  tier: string;
  ticketPrice: number;
  convenienceFee: number;
  total: number;
  contactEmail: string;
  contactPhone: string;
  onEditContact: () => void;
}

function EventTypeBadge({ type }: { type: EventType }) {
  const map: Record<EventType, { label: string; color: string }> = {
    movie:   { label: "Movie",   color: "#e63946" },
    standup: { label: "Comedy",  color: "#f4a261" },
    concert: { label: "Concert", color: "#457b9d" },
    other:   { label: "Event",   color: "#6c757d" },
  };
  const { label, color } = map[type];
  return (
    <span className={styles.eventTypeBadge} style={{ background: color }}>
      {label}
    </span>
  );
}

function OrderSummary({
  eventType, title, venue, screen, dateTime, seats,
  format, tier, ticketPrice, convenienceFee, total,
  contactEmail, contactPhone, onEditContact,
}: SummaryProps) {
  const [offerOpen, setOfferOpen] = useState(false);

  return (
    <aside className={styles.summary}>
      {/* ── Booking details card ── */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardHeader}>
          <div className={styles.summaryTitleRow}>
            <span className={styles.summaryTitle}>{title}</span>
            <EventTypeBadge type={eventType} />
          </div>
          <span className={styles.summarySeatCount}>{seats.length}</span>
        </div>

        <p className={styles.summaryDateTime}>{dateTime}</p>

        {/* Movie-specific fields */}
        {eventType === "movie" && (
          <p className={styles.summaryMeta}>{format}</p>
        )}

        {seats.length > 0 && (
          <p className={styles.summaryMeta}>
            {tier} · {seats.join(", ")}
          </p>
        )}

        <p className={styles.summaryVenue}>{venue}{screen ? ` (${screen})` : ""}</p>

        {/* Age warning for movies */}
        {eventType === "movie" && (
          <div className={styles.ageWarning}>
            <span className={styles.ageIcon}>🔞</span>
            <span>This movie is only for audience above the age of 18</span>
          </div>
        )}

        {/* Cancellation note */}
        <div className={styles.cancellationNote}>
          <strong>Cancellation Unavailable</strong>
          <p>This venue supports booking cancellation only upto 4 hour(s) prior to show time.</p>
        </div>
      </div>

      {/* ── Price breakdown ── */}
      <div className={styles.summaryCard}>
        <div className={styles.priceRow}>
          <span>Ticket(s) price</span>
          <span>{formatINR(ticketPrice)}</span>
        </div>
        <div className={`${styles.priceRow} ${styles.priceRowTotal}`}>
          <span>Order total</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>

      {/* ── Contact for booking details ── */}
      <div className={styles.summaryCard}>
        <div className={styles.contactHeader}>
          <span className={styles.contactTitle}>For Sending Booking Details</span>
          <button type="button" className={styles.editBtn} onClick={onEditContact}>
            ✏️ Edit
          </button>
        </div>
        <p className={styles.contactInfo}>{contactPhone} | {contactEmail}</p>
        <p className={styles.contactInfo}>Karnataka (for GST purposes)</p>
      </div>

      {/* ── Apply offers ── */}
      <button
        type="button"
        className={styles.offersRow}
        onClick={() => setOfferOpen((o) => !o)}
        aria-expanded={offerOpen}
      >
        <Tag size={16} weight="fill" className={styles.offersIcon} />
        <span>Apply Offers</span>
        <span className={styles.offersChevron}>{offerOpen ? "∧" : "›"}</span>
      </button>
      {offerOpen && (
        <div className={styles.offersPanel}>
          <p className={styles.noOffers}>No offers available at this time.</p>
        </div>
      )}

      {/* ── Consent + final total ── */}
      <div className={styles.summaryCard}>
        <p className={styles.consentText}>
          By proceeding, I express my consent to complete this transaction.
        </p>
        <div className={`${styles.priceRow} ${styles.priceRowFinal}`}>
          <span>Amount Payable</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: "upi",        label: "Pay by any UPI App",  icon: <DeviceMobile size={20} /> },
  { id: "card",       label: "Debit/Credit Card",   icon: <CreditCard size={20} /> },
  { id: "wallets",    label: "Mobile Wallets",      icon: <Wallet size={20} /> },
  { id: "voucher",    label: "Gift Voucher",        icon: <Gift size={20} /> },
  { id: "netbanking", label: "Net Banking",         icon: <Bank size={20} /> },
  { id: "paylater",   label: "Pay Later",           icon: <Timer size={20} /> },
  { id: "points",     label: "Redeem Points",       icon: <PiggyBank size={20} /> },
];

type ShowDetails = { event_title: string; screen_name: string; start_time: string; base_price: string; venue: { name: string } };
type Ticket = { booking_id: string; status: "confirmed"; total_amount: string; start_time: string;
  event: { title: string }; venue: { name: string }; screen: { name: string }; seats: { seat_id: string; label: string; price: string }[] };
function failureMessage(code?: string): string {
  const messages: Record<string, string> = {
    HOLD_EXPIRED: "Your hold expired. Select seats again.", HOLD_NOT_FOUND: "This hold is unavailable or belongs to another account.",
    SHOW_STARTED: "This show has already started.", SEATS_UNAVAILABLE: "One or more seats are no longer available. Select seats again.",
    HOLD_MISMATCH: "The seats do not match your hold.", IDEMPOTENCY_CONFLICT: "This checkout attempt conflicts with an earlier request. Do not submit it with a new key.",
    HOLD_TOKEN_CONFLICT: "This hold has already been used with different booking details.",
    PAYMENT_FAILED: "Simulated payment failed. No booking was created.", UNAUTHORIZED: "Sign in again, then retry this same checkout.",
  };
  return messages[code ?? ""] ?? "Temporary confirmation failure. Your booking attempt is saved; retry to recover the result.";
}

export function CheckoutPage() {
  const router = useRouter();
  const { session, openAuthModal } = useAuth();
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [seatLabels, setSeatLabels] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [reload, setReload] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const expired = remaining === 0 && !checkout?.attempted;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [editingContact, setEditingContact] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setBlocked(false);
    setError("");
    setDeadline(null);
    setRemaining(null);
    (async () => {
      try {
        const current = readCheckoutSession();
        if (!current) {
          const receipt = sessionStorage.getItem(RECEIPT_KEY);
          if (receipt && session) {
            const saved = JSON.parse(receipt) as { user_id: string; ticket: Ticket };
            if (saved.user_id === session.user.user_id) setTicket(saved.ticket);
          }
          if (active) setError("No active seat hold. Select seats and create a hold before checkout.");
          return;
        }
        if (active) setCheckout(current);
        if (!session) { if (active) setError("Sign in to continue checkout."); return; }
        const headers = { Authorization: `Bearer ${session.accessToken}` };
        const showRes = await fetch(`/api/shows/${current.show_id}`, { cache: "no-store" });
        if (!showRes.ok) throw new Error("Could not load show details. Please retry.");
        const details = await showRes.json() as ShowDetails;
        if (active) setShow(details);
        // After an ambiguous confirmation, Redis may be gone because the booking
        // committed. Never block a replay on a hold/availability lookup.
        if (!current.attempted) {
          const requestedAt = performance.now();
          const holdRes = await fetch(`/api/shows/${current.show_id}/holds/${current.hold_token}`, { headers, cache: "no-store" });
          const hold = await holdRes.json();
          if (!holdRes.ok) {
            if (active) setBlocked([404, 409].includes(holdRes.status));
            throw new Error(failureMessage(hold.error?.code));
          }
          if (JSON.stringify([...hold.seat_ids].sort()) !== JSON.stringify([...current.seat_ids].sort())) {
            if (active) setBlocked(true);
            throw new Error("Your selected seats do not match this hold. Select seats again.");
          }
          const expiry = Date.parse(hold.expires_at);
          const serverTime = Date.parse(hold.server_time);
          if (!Number.isFinite(expiry) || !Number.isFinite(serverTime)) {
            throw new Error("Could not verify reservation expiry. Please reload checkout.");
          }
          // Server timestamps avoid device clock skew. Subtract the full request
          // time conservatively; entering checkout never grants a fresh hold.
          const end = requestedAt + Math.max(0, Math.min(expiry, Date.parse(details.start_time)) - serverTime);
          if (active) {
            setDeadline(end);
            setRemaining(Math.max(0, Math.ceil((end - performance.now()) / 1000)));
          }
        }
        const mapRes = await fetch(`/api/shows/${current.show_id}/seats`, { headers, cache: "no-store" });
        if (mapRes.ok) {
          const map = await mapRes.json() as { seats: { seat_id: string; label: string }[] };
          if (active) setSeatLabels(map.seats.filter(seat => current.seat_ids.includes(seat.seat_id)).map(seat => seat.label));
        }
        if (active) setReady(true);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load checkout. Please retry.");
      }
    })();
    return () => { active = false; };
  }, [session, reload]);

  useEffect(() => {
    if (deadline === null || ticket) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [deadline, ticket]);

  const handlePay = async () => {
    if (!checkout || !session || inFlight.current || !ready || blocked) return;
    if (!checkout.attempted && (deadline === null || performance.now() >= deadline)) {
      setRemaining(0);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      // Persist before sending. Timeout/reload/retry always uses this same body/key.
      const attempt = { ...checkout, attempted: true };
      sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(attempt));
      setCheckout(attempt);
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}`,
          "Idempotency-Key": attempt.idempotency_key },
        body: JSON.stringify({ show_id: attempt.show_id, hold_token: attempt.hold_token,
          seat_ids: attempt.seat_ids, payment_result: "success" }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (!res.ok) {
        setBlocked(["HOLD_EXPIRED", "HOLD_NOT_FOUND", "SHOW_STARTED", "SEATS_UNAVAILABLE", "HOLD_MISMATCH", "IDEMPOTENCY_CONFLICT", "HOLD_TOKEN_CONFLICT"].includes(data.error?.code));
        throw new Error(failureMessage(data.error?.code));
      }
      if (data.status !== "confirmed" || typeof data.booking_id !== "string" ||
          typeof data.total_amount !== "string" || !Array.isArray(data.seats) || !data.event || !data.venue || !data.screen) {
        throw new Error("The booking response was incomplete. Retry to recover your booking.");
      }
      setTicket(data as Ticket);
      try {
        sessionStorage.setItem(RECEIPT_KEY, JSON.stringify({ user_id: session.user.user_id, ticket: data }));
        // Don't delete a replacement checkout created while this request was running.
        if (readCheckoutSession()?.idempotency_key === attempt.idempotency_key) sessionStorage.removeItem(CHECKOUT_KEY);
      } catch { /* Keep the attempt if receipt persistence fails; replay remains safe. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation could not be completed. Retry with the same booking attempt.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const movie = ticket?.event.title ?? show?.event_title ?? "Checkout";
  const theatre = ticket?.venue.name ?? show?.venue.name ?? "";
  const screen = ticket?.screen.name ?? show?.screen_name ?? "";
  const fullDateTime = (ticket?.start_time ?? show?.start_time) ? new Date((ticket?.start_time ?? show?.start_time)!).toLocaleString() : "";
  const seats = ticket ? ticket.seats.map(seat => seat.label) : seatLabels;
  const eventType: EventType = "other";
  const format = "";
  const tier = "Seats";
  // Preview uses the database show price only; the confirmed total is authoritative.
  const ticketPrice = ticket ? Number(ticket.total_amount) : Number(show?.base_price ?? 0) * (checkout?.seat_ids.length ?? 0);
  const convenienceFee = 0;
  const orderTotal = ticketPrice;

  if (ticket) {
    return (
      <div className={styles.successPage}>
        <CheckCircle size={72} weight="fill" className={styles.successIcon} />
        <h1 className={styles.successTitle}>Booking Confirmed!</h1>
        <p className={styles.successSub}>{movie}</p>
        <p className={styles.successMeta}>Booking reference: {ticket.booking_id}</p>
        <p className={styles.successMeta}>{fullDateTime}</p>
        {seats.length > 0 && <p className={styles.successMeta}>Seats: {seats.join(", ")}</p>}
        <p className={styles.successMeta}>{theatre}</p>
        <p className={styles.successTotal}>Total paid: {formatINR(orderTotal)}</p>
        <button
          type="button"
          className={styles.successHomeBtn}
          onClick={() => router.push("/")}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Top bar ── */}
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
          <span className={styles.topBarTitle}>{movie}</span>
          <span className={styles.topBarSub}>
            {[theatre, screen, fullDateTime].filter(Boolean).join(" | ")}
          </span>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ── Left: Payment ── */}
        <main className={styles.paymentSection}>
          <div className={`${styles.reservationNotice} ${expired || blocked ? styles.reservationExpired : ""}`}>
            <Timer size={23} aria-hidden="true" />
            <div>{blocked ? <><strong>Reservation unavailable</strong><p>Select your seats again to continue.</p></> : checkout?.attempted ? <><strong>{busy ? "Confirming your booking…" : "Check your booking confirmation"}</strong><p>Your confirmation was submitted. Retry the same attempt to check its result.</p></> : expired ? <><strong>Your reservation expired</strong><p>Select seats again to continue.</p></> : <><strong>Complete payment {remaining === null ? "before your reservation expires" : <>in <span role="timer" aria-label="Reservation time remaining">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</span></>}</strong><p>{remaining === null ? "Checking your reservation…" : "Your selected seats are reserved until this timer ends."}</p></>}</div>
          </div>
          {expired && <p role="alert" className={styles.expiryAlert}>Your reservation expired. Select seats again.</p>}
          <h2 className={styles.sectionTitle}>Payment options</h2>

          <div className={styles.paymentLayout}>
            {/* Method list */}
            <nav className={styles.methodList} aria-label="Payment methods">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.methodItem} ${selectedMethod === opt.id ? styles.methodItemActive : ""}`}
                  onClick={() => setSelectedMethod(opt.id)}
                  aria-pressed={selectedMethod === opt.id}
                >
                  <span className={styles.methodIcon}>{opt.icon}</span>
                  <span className={styles.methodLabel}>{opt.label}</span>
                </button>
              ))}
            </nav>

            {/* Active panel */}
            <div className={styles.methodPanel}>
              {selectedMethod === "upi"        && <UpiPanel />}
              {selectedMethod === "card"       && <CardPanel />}
              {selectedMethod === "wallets"    && <SimplePanel title="Mobile Wallets"  message="Select your wallet provider to continue." />}
              {selectedMethod === "voucher"    && <SimplePanel title="Gift Voucher"    message="Enter your gift voucher code to redeem." />}
              {selectedMethod === "netbanking" && <SimplePanel title="Net Banking"     message="Select your bank to continue with net banking." />}
              {selectedMethod === "paylater"   && <SimplePanel title="Pay Later"       message="Pay after your booking with supported services." />}
              {selectedMethod === "points"     && <SimplePanel title="Redeem Points"   message="You have 0 BookMyShow Super Points available." />}

              <p className={styles.demoNote}>Demo payment—no money charged.</p>
              {error && <p role="alert">{error}</p>}
              {!session && <button type="button" onClick={openAuthModal}>Sign in</button>}
              {!ready && !blocked && <button type="button" onClick={() => setReload(value => value + 1)}>Reload checkout</button>}
              {(blocked || expired) && <button type="button" className={styles.selectAgainBtn} onClick={() => router.push(checkout ? `/shows/${checkout.show_id}/seats` : "/")}>Select seats again</button>}
              {/* Pay button inside panel */}
              <button
                type="button"
                className={styles.payNowBtn}
                onClick={handlePay}
                disabled={!ready || busy || blocked || expired || !session}
              >
                {busy ? "Confirming…" : checkout?.attempted ? "Retry confirmation" : `Simulate payment · ${formatINR(orderTotal)}`}
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className={styles.checkoutFooter}>
            <div className={styles.footerLogo}>
              book<span>my</span>show
            </div>
            <div className={styles.footerNote}>
              <strong>Note:</strong>
              <ol>
                <li>Registrations/Tickets once booked cannot be exchanged, cancelled or refunded.</li>
                <li>In case of Credit/Debit Card bookings, the Card and holder must be present at the ticket counter while collecting the ticket(s).</li>
              </ol>
              <p className={styles.footerSafe}>As safe as it gets</p>
              <div className={styles.footerBadges} aria-label="Security certifications">
                {["PCI DSS", "SISA", "Verified VISA", "MasterCard", "SafeKey"].map((b) => (
                  <span key={b} className={styles.footerBadge}>{b}</span>
                ))}
              </div>
            </div>
          </footer>
        </main>

        {/* ── Right: Order summary ── */}
        {editingContact ? (
          <aside className={styles.summary}>
            <div className={styles.summaryCard}>
              <h3 className={styles.methodContentTitle}>Edit contact details</h3>
              <label className={styles.cardLabel}>
                Mobile
                <input className={styles.cardInput} type="tel" value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)} />
              </label>
              <label className={styles.cardLabel} style={{ marginTop: 12 }}>
                Email
                <input className={styles.cardInput} type="email" value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)} />
              </label>
              <button
                type="button"
                className={styles.payNowBtn}
                style={{ marginTop: 16 }}
                onClick={() => setEditingContact(false)}
              >
                Save
              </button>
            </div>
          </aside>
        ) : (
          <OrderSummary
            eventType={eventType}
            title={movie}
            venue={theatre}
            screen={screen}
            dateTime={fullDateTime}
            seats={seats}
            format={format}
            tier={tier}
            ticketPrice={ticketPrice}
            convenienceFee={convenienceFee}
            total={orderTotal}
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            onEditContact={() => setEditingContact(true)}
          />
        )}
      </div>
    </div>
  );
}
