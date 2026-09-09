import { createHash, randomUUID } from "node:crypto";
import { pool } from "./client.js";
import { withTransaction } from "./transactions.js";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { parseRegistration } from "../src/middleware/auth-validation.js";

// Keep demo identities stable across runs, including when the calendar changes.
function demoId(key: string): string {
  const hex = createHash("sha256").update(`bookmyshow-demo-v1:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function daysFromAnchor(anchor: Date, days: number, hour = 18, minute = 0): Date {
  const date = new Date(anchor);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

// Same demo catalogue and IDs used by the original seed.
const EVENTS = [
  { id: "11111111-0001-0000-0000-000000000001", type: "movie", title: "Spider-Man: Brand New Day", duration: 145,
    description: "Peter Parker faces an unprecedented multiversal chapter as fresh threats emerge in New York City. Striving to reclaim normalcy while upholding his heroic duty, Spider-Man confronts adversaries that test his convictions and resilience to their utmost boundaries.", poster_url: "/images/movies/spiderman.png" },
  { id: "11111111-0001-0000-0000-000000000002", type: "movie", title: "Baaghi 4", duration: 155,
    description: "Ronnie embarks on his most intense mission yet, pushing through lethal criminal cartels with relentless martial arts mastery and breathtaking stunts in a battle where no one is spared.", poster_url: "/images/movies/baaghi-4.jpg" },
  { id: "11111111-0001-0000-0000-000000000003", type: "movie", title: "Demon Slayer: Kimetsu no Yaiba – Infinity Castle", duration: 135,
    description: "Tanjiro and the Demon Slayer Corps infiltrate the shifting, perilous rooms of the Infinity Castle for the final showdown against Muzan Kibutsuji and the remaining Upper Rank demons.", poster_url: "/images/movies/demon-slayer.jpg" },
  { id: "11111111-0001-0000-0000-000000000004", type: "movie", title: "The Bengal Files", duration: 160,
    description: "A gripping historical investigative drama unearthing deeply buried truths and socio-political controversies from critical chapters in Bengal's turbulent past.", poster_url: "/images/movies/bengal-files.jpg" },
  { id: "11111111-0001-0000-0000-000000000005", type: "movie", title: "The Fantastic 4: First Steps", duration: 140,
    description: "Set against a vibrant retro-future 1960s backdrop, Marvel's first family must balance family dynamics with defending Earth from an existential cosmic peril.", poster_url: "/images/movies/fantastic-card.jpg" },
  { id: "11111111-0001-0000-0000-000000000006", type: "movie", title: "Vash Level 2", duration: 130,
    description: "Dark hypnotic occult forces return to torment an innocent family when unexplainable supernatural possessions unleash escalating psychological dread.", poster_url: "/images/movies/vash_level2.png" },
  { id: "11111111-0001-0000-0000-000000000007", type: "movie", title: "The Midnight Express", duration: 120, description: "Thriller · Hindi", poster_url: null },
  { id: "11111111-0001-0000-0000-000000000008", type: "movie", title: "The Last Light", duration: 110, description: "Drama · English", poster_url: null },
  { id: "11111111-0001-0000-0000-000000000009", type: "movie", title: "A Long Way Home", duration: 125, description: "Adventure · Hindi", poster_url: null },
  { id: "11111111-0001-0000-0000-000000000010", type: "movie", title: "Beyond the Orbit", duration: 118, description: "Science fiction · English", poster_url: null },
  { id: "11111111-0002-0000-0000-000000000001", type: "standup", title: "An Evening of Almost", duration: 90, description: "Comedy · Hindi, English", poster_url: "/images/movies/an_evening_almost.png" },
  { id: "11111111-0002-0000-0000-000000000002", type: "standup", title: "Completely Unfiltered", duration: 75, description: "Comedy · English", poster_url: "/images/movies/completely_unfiltered.png" },
  { id: "11111111-0003-0000-0000-000000000001", type: "concert", title: "After Hours Live", duration: 150, description: "Live music · English", poster_url: "/images/movies/afterhours.png" },
  { id: "11111111-0003-0000-0000-000000000002", type: "concert", title: "The Acoustic Room", duration: 120, description: "Acoustic · Hindi", poster_url: "/images/movies/acoustic_room.png" },
] as const;
const VENUES = [
  { id: "22222222-0001-0000-0000-000000000001", name: "Times Square Bharath Cinemas", address: "Udupi, Karnataka" },
  { id: "22222222-0001-0000-0000-000000000002", name: "Cinegalaxy Central Cinemas", address: "Manipal, Karnataka" },
  { id: "22222222-0001-0000-0000-000000000003", name: "PVR: Forum Mall, Koramangala", address: "Koramangala, Bangalore, Karnataka" },
] as const;
const SCREENS = [
  { id: "33333333-0001-0000-0000-000000000001", venue_id: VENUES[0].id, name: "Screen 1 – 3D" },
  { id: "33333333-0001-0000-0000-000000000002", venue_id: VENUES[0].id, name: "Screen 2 – 2D" },
  { id: "33333333-0002-0000-0000-000000000001", venue_id: VENUES[1].id, name: "Screen 1 – 3D" },
  { id: "33333333-0002-0000-0000-000000000002", venue_id: VENUES[1].id, name: "Screen 2 – 2D" },
  { id: "33333333-0003-0000-0000-000000000001", venue_id: VENUES[2].id, name: "Screen 1 – IMAX 3D" },
  { id: "33333333-0003-0000-0000-000000000002", venue_id: VENUES[2].id, name: "Screen 2 – 2D" },
] as const;
const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SEATS_PER_ROW = 10;
function buildSeats(screenId: string) {
  return ROWS.flatMap((row, rowIndex) => Array.from({ length: SEATS_PER_ROW }, (_, index) => {
    const number = index + 1;
    const seat_type = rowIndex >= 8 ? "premium" : rowIndex >= 5 ? "executive" : "standard";
    return { id: demoId(`seat:${screenId}:${row}:${number}`), screen_id: screenId, row, number, seat_type,
      price_tier: seat_type === "premium" ? "premium" : seat_type === "executive" ? "mid" : "base" };
  }));
}
function buildShows(anchor: Date) {
  const shows: Array<{ id: string; event_id: string; screen_id: string; start_time: Date; end_time: Date; base_price: number }> = [];
  const prices = [350, 200, 320, 180, 500, 250];
  SCREENS.forEach((screen, screenIndex) => {
    for (let day = 1; day <= 7; day++) {
      [11, 15, 19].forEach((hour, slot) => {
        const event = EVENTS[(screenIndex + slot % 2) % 6];
        const start = daysFromAnchor(anchor, day, hour);
        shows.push({ id: demoId(`show:${screen.id}:${day}:${slot}`), event_id: event.id, screen_id: screen.id,
          start_time: start, end_time: new Date(start.getTime() + event.duration * 60_000), base_price: prices[screenIndex] });
      });
    }
  });
  // Live events follow the movie week, avoiding the Bangalore evening movie slot.
  EVENTS.slice(10).forEach((event, index) => {
    const start = daysFromAnchor(anchor, 8 + index, 19, 30);
    shows.push({ id: demoId(`live:${event.id}`), event_id: event.id, screen_id: SCREENS[5].id,
      start_time: start, end_time: new Date(start.getTime() + event.duration * 60_000), base_price: 799 });
  });
  return shows;
}

try {
  if (process.env.NODE_ENV === "production") throw new Error("Local seed is disabled in production");
  const accounts = [
    { name: "Local Admin", email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.test", password: process.env.SEED_ADMIN_PASSWORD, role: "admin" },
    { name: "Local User", email: process.env.SEED_USER_EMAIL ?? "user@example.test", password: process.env.SEED_USER_PASSWORD, role: "user" },
  ];
  const prepared = await Promise.all(accounts.map(async account => {
    const input = parseRegistration({ name: account.name, email: account.email, password: account.password });
    return { ...input, role: account.role, hash: await hashPassword(input.password) };
  }));
  if (prepared[0].email === prepared[1].email) throw new Error("Seed emails must be different");
  await withTransaction(async client => {
    // Concurrent seed runs cannot choose different anchors or race over slots.
    await client.query("SELECT pg_advisory_xact_lock(917403)");
    for (const account of prepared) {
      const result = await client.query(
        "INSERT INTO users (user_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (lower(email)) DO NOTHING RETURNING user_id",
        [randomUUID(), account.name, account.email, account.hash, account.role],
      );
      if (!result.rowCount) {
        const existing = await client.query("SELECT role, password_hash FROM users WHERE lower(email) = $1", [account.email]);
        if (existing.rows[0]?.role !== account.role || !existing.rows[0]?.password_hash || !await verifyPassword(account.password, existing.rows[0].password_hash)) {
          throw new Error("Existing seed account differs from local seed configuration; no credentials or roles were overwritten");
        }
      }
    }
    for (const event of EVENTS) {
      await client.query(
        `INSERT INTO events (event_id, type, title, duration, description, poster_url)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (event_id) DO NOTHING`,
        [event.id, event.type, event.title, event.duration, event.description, event.poster_url],
      );
    }
    for (const venue of VENUES) {
      await client.query("INSERT INTO venues (venue_id, name, address) VALUES ($1, $2, $3) ON CONFLICT (venue_id) DO NOTHING", [venue.id, venue.name, venue.address]);
    }
    for (const screen of SCREENS) {
      await client.query("INSERT INTO screens (screen_id, venue_id, name) VALUES ($1, $2, $3) ON CONFLICT (screen_id) DO NOTHING", [screen.id, screen.venue_id, screen.name]);
      await client.query("SELECT screen_id FROM screens WHERE screen_id = $1 FOR UPDATE", [screen.id]);
      const seats = buildSeats(screen.id);
      for (const seat of seats) {
        await client.query(
          `INSERT INTO seats (seat_id, screen_id, "row", number, seat_type, price_tier)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (screen_id, "row", number) DO NOTHING`,
          [seat.id, seat.screen_id, seat.row, seat.number, seat.seat_type, seat.price_tier],
        );
      }
      const actual = await client.query<{ row: string; number: number }>('SELECT "row", number FROM seats WHERE screen_id = $1', [screen.id]);
      if (actual.rows.length !== seats.length || actual.rows.some(seat => !ROWS.includes(seat.row) || seat.number < 1 || seat.number > SEATS_PER_ROW)) {
        throw new Error(`Screen ${screen.id} has non-demo seats; refusing to overwrite its layout`);
      }
      await client.query("UPDATE screens SET layout_json = $2::jsonb WHERE screen_id = $1", [screen.id,
        JSON.stringify({ rows: ROWS.length, seats_per_row: SEATS_PER_ROW, orientation: "stage_top", disabled_positions: [] })]);
    }
    // Freeze the initial demo schedule. Reruns do not extend/move it every day.
    const anchorResult = await client.query<{ first_start: Date | null }>(
      `SELECT min(start_time) AS first_start FROM shows WHERE screen_id = ANY($1::uuid[]) AND event_id = ANY($2::uuid[])`,
      [SCREENS.map(screen => screen.id), EVENTS.slice(0, 6).map(event => event.id)],
    );
    const firstStart = anchorResult.rows[0].first_start;
    const anchor = firstStart ? daysFromAnchor(firstStart, -1, 0) : daysFromAnchor(new Date(), 0, 0);
    let insertedShows = 0;
    let skippedShows = 0;
    for (const show of buildShows(anchor)) {
      // Also recognize exact legacy shows created with random UUIDs.
      const existing = await client.query(
        `SELECT show_id FROM shows WHERE show_id = $1 OR (screen_id = $2 AND event_id = $3 AND start_time = $4)`,
        [show.id, show.screen_id, show.event_id, show.start_time],
      );
      if (existing.rowCount) continue;
      const overlap = await client.query(
        "SELECT show_id FROM shows WHERE screen_id = $1 AND start_time < $3 AND end_time > $2 LIMIT 1",
        [show.screen_id, show.start_time, show.end_time],
      );
      if (overlap.rowCount) { skippedShows++; continue; }
      await client.query(
        `INSERT INTO shows (show_id, event_id, screen_id, start_time, end_time, base_price) VALUES ($1, $2, $3, $4, $5, $6)`,
        [show.id, show.event_id, show.screen_id, show.start_time, show.end_time, show.base_price],
      );
      insertedShows++;
    }
    const legacyOverlaps = await client.query(
      `SELECT 1 FROM shows a JOIN shows b ON a.screen_id = b.screen_id AND a.show_id < b.show_id
       AND a.start_time < b.end_time AND a.end_time > b.start_time
       WHERE a.screen_id = ANY($1::uuid[]) LIMIT 1`, [SCREENS.map(screen => screen.id)],
    );
    if (legacyOverlaps.rowCount) console.warn("Existing overlapping shows need manual reconciliation; seed does not delete or reschedule existing shows.");
    console.log(`${insertedShows} new shows prepared; ${skippedShows} conflicting slots skipped`);
  });
  console.log("Seed complete: demo catalogue, 6 screens with 100 seats each, and shows. Credentials remain in local SEED_* variables.");
} catch (error) {
  console.error("Seed failed:", error instanceof Error && !("code" in error) ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
