export type Show = {
  show_id: string;
  event_id: string;
  screen_id: string;
  start_time: string;
  end_time: string;
  base_price: string;
  event_title: string;
  venue: { venue_id: string; name: string; address: string };
  screen_name: string;
};
export type ShowListOptions = { page: number; page_size: number };
export type ShowList = ShowListOptions & { items: Show[]; total: number };
export type SeatLayout = {
  rows: number;
  seats_per_row: number;
  orientation: "stage_top";
  disabled_positions: { row: string; number: number }[];
} | Record<string, never>;
export type ShowSeatMap = {
  show_id: string;
  layout_json: SeatLayout;
  base_price: string;
  server_time: string;
  seats: {
    seat_id: string;
    row: string;
    number: number;
    label: string;
    seat_type: string;
    price_tier: string;
    status: "available" | "booked" | "held_by_me" | "held_by_other";
    expires_at: string | null;
  }[];
};
