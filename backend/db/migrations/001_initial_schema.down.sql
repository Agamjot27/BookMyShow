-- Destructive rollback. Run only against an intended development database.
BEGIN;
DROP TABLE booking_seats;
DROP FUNCTION validate_booking_seat_screen();
DROP TABLE bookings;
DROP TABLE shows;
DROP TABLE events;
DROP TABLE seats;
DROP TABLE screens;
DROP TABLE users;
DROP TABLE venues;
COMMIT;
