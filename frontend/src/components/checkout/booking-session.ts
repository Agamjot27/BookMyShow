export const CHECKOUT_KEY = "bms_checkout_session";
export const RECEIPT_KEY = "bms_checkout_receipt";
export type CheckoutSession = {
  show_id: string; hold_token: string; seat_ids: string[];
  idempotency_key: string; attempted: boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readCheckoutSession(): CheckoutSession | null {
  const raw = sessionStorage.getItem(CHECKOUT_KEY);
  if (!raw) return null;
  const value = JSON.parse(raw) as CheckoutSession;
  if (!uuid.test(value.show_id) || !uuid.test(value.hold_token) || !Array.isArray(value.seat_ids) ||
      value.seat_ids.length < 1 || value.seat_ids.length > 6 || value.seat_ids.some(id => !uuid.test(id)) ||
      new Set(value.seat_ids.map(id => id.toLowerCase())).size !== value.seat_ids.length) throw new Error("Invalid booking session. Select your seats again.");
  if (!value.idempotency_key) value.idempotency_key = crypto.randomUUID();
  if (!uuid.test(value.idempotency_key)) throw new Error("Invalid checkout attempt");
  value.attempted = value.attempted === true;
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value));
  return value;
}
// Call with the successful hold API response before navigating to /checkout.
export function saveCheckoutSession(hold: { show_id: string; hold_token: string; seat_ids: string[] }) {
  const existing = readCheckoutSession();
  if (existing?.hold_token === hold.hold_token) return existing;
  const value: CheckoutSession = { ...hold, idempotency_key: crypto.randomUUID(), attempted: false };
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value));
  sessionStorage.removeItem(RECEIPT_KEY);
  return value;
}
