export type Venue = {
  venue_id: string;
  name: string;
  address: string;
};

export type Screen = {
  screen_id: string;
  venue_id: string;
  name: string;
  layout_json: Record<string, unknown>;
};

export type Seat = {
  seat_id: string;
  screen_id: string;
  row: string;
  number: number;
  seat_type: string;
  price_tier: string;
};
