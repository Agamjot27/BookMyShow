CREATE TABLE venues (
  venue_id uuid PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL
);

CREATE TABLE users (
  user_id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'admin'))
);
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE screens (
  screen_id uuid PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES venues (venue_id) ON DELETE RESTRICT,
  name text NOT NULL,
  layout_json jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX screens_venue_id_idx ON screens (venue_id);

CREATE TABLE seats (
  seat_id uuid PRIMARY KEY,
  screen_id uuid NOT NULL REFERENCES screens (screen_id) ON DELETE RESTRICT,
  "row" text NOT NULL,
  number integer NOT NULL CHECK (number > 0),
  seat_type text NOT NULL DEFAULT 'standard',
  price_tier text NOT NULL DEFAULT 'base',
  CONSTRAINT seats_screen_row_number_key UNIQUE (screen_id, "row", number)
);

CREATE TABLE events (
  event_id uuid PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('movie', 'standup', 'concert')),
  title text NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  poster_url text,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE shows (
  show_id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events (event_id) ON DELETE RESTRICT,
  screen_id uuid NOT NULL REFERENCES screens (screen_id) ON DELETE RESTRICT,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  base_price numeric(12,2) NOT NULL CHECK (base_price >= 0),
  CONSTRAINT shows_time_order_check CHECK (end_time > start_time)
);
CREATE INDEX shows_event_start_idx ON shows (event_id, start_time);
CREATE INDEX shows_screen_start_idx ON shows (screen_id, start_time);

CREATE TABLE bookings (
  booking_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  show_id uuid NOT NULL REFERENCES shows (show_id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('confirmed')),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  hold_token uuid NOT NULL,
  CONSTRAINT bookings_id_show_key UNIQUE (booking_id, show_id),
  CONSTRAINT bookings_user_idempotency_key UNIQUE (user_id, idempotency_key),
  CONSTRAINT bookings_hold_token_key UNIQUE (hold_token)
);
CREATE INDEX bookings_user_created_idx ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_show_id_idx ON bookings (show_id);

CREATE TABLE booking_seats (
  booking_id uuid NOT NULL,
  seat_id uuid NOT NULL REFERENCES seats (seat_id) ON DELETE RESTRICT,
  show_id uuid NOT NULL REFERENCES shows (show_id) ON DELETE RESTRICT,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  PRIMARY KEY (booking_id, seat_id),
  CONSTRAINT booking_seats_show_seat_key UNIQUE (show_id, seat_id),
  CONSTRAINT booking_seats_booking_show_fk FOREIGN KEY (booking_id, show_id)
    REFERENCES bookings (booking_id, show_id) ON DELETE RESTRICT
);

CREATE FUNCTION validate_booking_seat_screen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seat_screen uuid;
  show_screen uuid;
BEGIN
  SELECT screen_id INTO seat_screen FROM seats WHERE seat_id = NEW.seat_id;
  SELECT screen_id INTO show_screen FROM shows WHERE show_id = NEW.show_id;
  IF seat_screen IS NULL OR show_screen IS NULL OR seat_screen <> show_screen THEN
    RAISE EXCEPTION 'Seat must belong to the show screen'
      USING ERRCODE = '23514', CONSTRAINT = 'booking_seats_screen_match';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_seats_screen_match
BEFORE INSERT OR UPDATE ON booking_seats
FOR EACH ROW EXECUTE FUNCTION validate_booking_seat_screen();

-- Per TRD, overlap prevention is a future service transaction that locks screens.
-- No exclusion constraint or additional inventory/entity table is introduced.
