# PRD: Ticket Booking Platform — V1

**Stack:** Next.js frontend, Node.js backend, PostgreSQL, Redis

**Scope:** A single-city platform for discovering movies, standup shows, and concerts, selecting reserved seats, and completing bookings through stubbed payment.

## 1. Problem statement

Users need a simple way to discover events, find showtimes, and book available seats without another user booking the same seats during checkout. Administrators need a lightweight interface to manage events, venues, schedules, and seating, and review bookings and performance.

V1 should demonstrate a reliable end-to-end booking flow and basic administration within a short take-home timeframe. Prioritize booking correctness and clear interactions over production-scale infrastructure or extensive customization.

## 2. Personas

| Persona | Goal | Primary needs |
|---|---|---|
| End user | Find an event and reserve seats | Browse events, compare showtimes, see current seat availability, complete checkout, retrieve tickets |
| Admin | Publish bookable shows and track performance | Manage event and venue data, configure seats, schedule shows, inspect bookings and basic metrics |

**Access assumption:** Authentication uses a passwordless OTP flow — users enter their email, receive a 6-digit OTP, and are issued a JWT access token plus a rotating refresh token. Public sign-up is implicit: verifying an OTP for a new email creates a `user`-role account automatically. Admin accounts are bootstrapped via the local seed (see setup instructions). Password recovery and account management are excluded. Browsing is public; booking and history require sign-in. Admin routes and APIs require the admin role.

## 3. User stories and acceptance criteria

### 3.1 Browse events

**Story:** As an end user, I want to browse events by category so I can find something to attend.

**Acceptance criteria:**

- Display events with at least one upcoming show, including title, poster or fallback image, and category.
- Support category filters: All, Movies, Standup, Concerts.
- Selecting an event opens its detail page.
- Display an empty state when no events match.
- Full-text search, sorting, and advanced filters are not required.

### 3.2 View event details and showtimes

**Story:** As an end user, I want to see event details and upcoming shows so I can choose a suitable time and venue.

**Acceptance criteria:**

- Display the event’s title, description, category, duration, and poster.
- List upcoming shows with date, time, venue, screen or performance space, and seat price.
- Selecting a show opens its seat map.
- Past shows cannot be booked.
- V1 uses one fixed price per seat for each show.

### 3.3 Select seats and hold them temporarily

**Story:** As an end user, I want to see seat availability and temporarily reserve my selected seats so I can check out without losing them to another user.

**Acceptance criteria:**

- Render a labeled row-and-column seat map with a screen or stage indicator.
- Visually distinguish available seats, my selection, my held seats, seats held by others, and booked seats.
- Users can select up to six available seats. Local selection alone does not reserve seats.
- Continuing to checkout requests an atomic hold on all selected seats. If any seat is unavailable, no partial hold is created and the user sees an availability message.
- A successful hold lasts five minutes, with a visible countdown at checkout.
- Booked seats and seats held by another user cannot be held.
- Seat status updates without a page reload, within two seconds of a hold, release, expiry, or booking. Polling is acceptable for V1.
- Expired holds make seats available again. Returning to change seats releases the current hold.
- Availability and ownership are enforced by the backend, not only by the UI.

### 3.4 Book seats with stubbed payment

**Story:** As an end user, I want to review my reservation and simulate payment so I can complete a booking.

**Acceptance criteria:**

- Checkout shows the event, venue, showtime, seat labels, quantity, total price, and remaining hold time.
- Total price equals seat count multiplied by the show’s seat price; no additional fees or taxes are modeled.
- The payment stub supports explicit success and failure outcomes. No card or banking details are collected.
- Successful payment confirms the booking only if the hold is still valid and belongs to the current user.
- Confirmation stores the booking and booked seats in PostgreSQL and returns a unique booking reference.
- Failed payment does not confirm seats; the user may retry while the hold remains valid.
- An expired hold prevents confirmation and directs the user back to seat selection.
- Repeated submission of the same checkout cannot create duplicate bookings.
- Concurrent checkout attempts cannot confirm the same seat for the same show.

### 3.5 View booking history and ticket details

**Story:** As an end user, I want to view my bookings and ticket details so I can retrieve my reservation later.

**Acceptance criteria:**

- Display the signed-in user’s confirmed bookings, newest first.
- Each entry shows event title, showtime, venue, seat count, and total paid.
- Ticket details show the booking reference, event, venue, screen or performance space, showtime, seat labels, and total paid.
- Users cannot access another user’s bookings through either the UI or API.
- Display an empty state when there are no bookings.
- On-screen ticket details are sufficient; downloadable tickets and QR scanning are excluded.

### 3.6 Manage venues and screens

**Story:** As an admin, I want to manage venues and their bookable spaces so I can host shows.

**Acceptance criteria:**

- Create, list, edit, and delete venues with a name and address.
- Create, list, edit, and delete screens or performance spaces belonging to a venue.
- Use the same “screen/space” entity for cinema screens, standup rooms, and concert halls.
- Required fields are validated and errors are displayed.
- Deletion is blocked when dependent screens or shows exist, with an explanation.

### 3.7 Configure seat layouts

**Story:** As an admin, I want to configure a simple seat layout for a screen or space so users can select labeled seats.

**Acceptance criteria:**

- Generate a rectangular layout using a row count and seats per row.
- Assign unique labels such as A1, A2, and B1 within each space.
- Allow individual positions to be disabled for gaps or unavailable seats.
- Preview the resulting layout before saving.
- Prevent layout changes once any show references the space, preserving seat identity.
- Drag-and-drop design, seat tiers, balconies, and standing areas are excluded.

### 3.8 Manage events

**Story:** As an admin, I want to manage event details so users can discover what is playing.

**Acceptance criteria:**

- Create, list, edit, and delete events.
- Support title, description, category, duration, and optional poster URL.
- Restrict categories to Movies, Standup, and Concerts.
- Validate required fields and positive duration.
- Block deletion when an event has associated shows.
- Image upload and media management are excluded.

### 3.9 Manage shows

**Story:** As an admin, I want to schedule an event in a configured space so users can book it.

**Acceptance criteria:**

- Create, list, edit, and delete shows with an event, screen/space, start time, and fixed seat price.
- Require a saved seat layout and a future start time when creating a show.
- Derive and store the show’s end time from the event duration when scheduling.
- Prevent overlapping shows in the same space.
- Allow editing or deletion only when the show has no active holds or confirmed bookings.
- Display validation failures clearly.
- Recurring schedules and bulk show creation are excluded.

### 3.10 View bookings as an admin

**Story:** As an admin, I want to inspect bookings so I can see which seats were sold.

**Acceptance criteria:**

- List confirmed bookings, newest first.
- Show booking reference, user identifier, event, showtime, seats, total paid, and booking time.
- Support filtering by show and opening booking details.
- Booking modification, cancellation, refunds, and export are excluded.

### 3.11 View basic revenue and occupancy analytics

**Story:** As an admin, I want a simple view of sales and occupancy so I can assess show performance.

**Acceptance criteria:**

- Display total simulated revenue, confirmed booking count, and seats sold.
- Display a per-show table with event, showtime, seats sold, sellable capacity, occupancy, and revenue.
- Revenue is the sum of confirmed booking totals.
- Occupancy is confirmed seats divided by enabled seats in the show’s layout.
- Exclude temporary holds and failed payments from all sales metrics.
- Calculate metrics from persisted data; update on page load or manual refresh.
- Date filters, charts, and live analytics are not required.

## 4. Success metrics

For this take-home, success means demonstrable functionality and correctness rather than production adoption targets.

| Metric | V1 target / verification |
|---|---|
| End-to-end booking | A user can browse, select a show, hold seats, simulate payment, and retrieve a ticket |
| Double-booking prevention | Zero duplicate confirmed seats in concurrent booking tests |
| Checkout idempotency | Repeated confirmation requests produce one booking |
| Hold expiry | Expired holds cannot confirm bookings; seats reappear as available within two seconds |
| Availability freshness | Another client reflects seat-status changes within two seconds |
| Access control | Users cannot read other users’ bookings; non-admins cannot access admin operations |
| Admin completeness | An admin can create a venue, layout, event, and show that becomes bookable |
| Analytics accuracy | Revenue and occupancy match confirmed bookings in a seeded test dataset |

**Implementation boundary:** PostgreSQL is the source of truth for catalog data, layouts, shows, and confirmed bookings, including a database uniqueness constraint for each booked show-seat pair. Redis manages temporary holds with expiry. Hold acquisition and final confirmation must coordinate so stale holds cannot sell seats. No additional services are required.

## 5. Out of scope for V1

- Real payment gateways, payment reconciliation, refunds, and cancellations.
- Email, SMS, push, or other notifications.
- Multi-city search and location discovery.
- Discounts, coupons, offers, and loyalty programs.
- Recommendation engines.
- Social sign-in, password recovery, and profile management APIs.
- General-admission inventory, complex seating layouts, and seat-specific pricing.
- Ticket downloads, QR validation, and venue check-in.
- Advanced search, media uploads, bulk administration, and analytics exports.
- Waitlists, recurring event scheduling, and production-scale operational infrastructure.

## 6. Resolved design decisions

| Question | Decision |
|---|---|
| Sign-in mechanism | Passwordless OTP — users enter their email, receive a 6-digit code, and are issued JWT access token plus rotating refresh token |
| Admin account | Bootstrapped via seed: `SEED_ADMIN_EMAIL` is upserted with `role='admin'`; same OTP login flow applies |
| Hold duration and booking limit | Five minutes from acquisition; maximum six seats per booking |
| Real-time availability | Seat map polls every one second while the page is visible; backend remains authoritative |
| Event categories | All categories (movies, standup, concerts) use reserved seating |
| Currency and timezone | INR; timestamps stored in UTC |
| Booking close time | At show start time; confirmation must succeed before then |
| Show editing after activity | Blocked once active holds or confirmed bookings exist |
