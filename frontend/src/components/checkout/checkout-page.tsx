"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
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

const CONVENIENCE_RATE = 0.212; // ~21.2% convenience fee (matches BMS)

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
        <div className={styles.priceRow}>
          <span>Convenience fees <span className={styles.feesCaret}>∨</span></span>
          <span>{formatINR(convenienceFee)}</span>
        </div>
        <div className={styles.priceRow}>
          <span>
            Give to Underprivileged Musicians
            <br />
            <span className={styles.charityNote}>(₹1 per ticket) <button type="button" className={styles.tncLink}>VIEW T&amp;C</button></span>
          </span>
          <div className={styles.charityRight}>
            <span className={styles.charityZero}>₹0.00</span>
            <button type="button" className={styles.charityAdd}>Add ₹{seats.length}.00</button>
          </div>
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

export function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Query params passed from seat layout page
  const movie      = params.get("movie")   ?? "Event";
  const rawSeats   = params.get("seats")   ?? "";
  const rawTotal   = parseFloat(params.get("total") ?? "0");
  const theatre    = params.get("theatre") ?? "";
  const screen     = params.get("screen")  ?? "";
  const dateTime   = params.get("date")    ?? "";
  const showTime   = params.get("time")    ?? "";
  const format     = params.get("format")  ?? "2D";
  const tier       = params.get("tier")    ?? "GOLD";
  const rawType    = params.get("type")    ?? "movie";

  const eventType  = resolveEventType(rawType);
  const seats      = rawSeats ? rawSeats.split(",") : [];
  const ticketPrice    = rawTotal;
  const convenienceFee = parseFloat((ticketPrice * CONVENIENCE_RATE).toFixed(2));
  const orderTotal     = parseFloat((ticketPrice + convenienceFee).toFixed(2));

  const fullDateTime = [dateTime, showTime].filter(Boolean).join(" | ");

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [contactEmail, setContactEmail] = useState("guest@example.com");
  const [contactPhone, setContactPhone] = useState("+91-0000000000");
  const [editingContact, setEditingContact] = useState(false);
  const [paid, setPaid] = useState(false);

  const handlePay = () => {
    // Simulate payment — in production this would call the bookings API
    setPaid(true);
  };

  if (paid) {
    return (
      <div className={styles.successPage}>
        <CheckCircle size={72} weight="fill" className={styles.successIcon} />
        <h1 className={styles.successTitle}>Booking Confirmed!</h1>
        <p className={styles.successSub}>{movie}</p>
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

              {/* Pay button inside panel */}
              <button
                type="button"
                className={styles.payNowBtn}
                onClick={handlePay}
              >
                Pay {formatINR(orderTotal)}
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
