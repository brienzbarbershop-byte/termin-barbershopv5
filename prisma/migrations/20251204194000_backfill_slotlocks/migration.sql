-- Backfill SlotLock cells from existing bookings
-- Uses Europe/Zurich local time to compute day anchor and minute offsets

WITH b AS (
  SELECT
    bk.id AS booking_id,
    (bk.date AT TIME ZONE 'Europe/Zurich') AS local_dt,
    COALESCE(s.duration, 30) AS duration
  FROM "Booking" bk
  JOIN "Service" s ON s.id = bk."serviceId"
  WHERE bk.status = 'BESTAETIGT'
),
cells AS (
  SELECT
    booking_id,
    date_trunc('day', local_dt)::timestamp AS day_anchor,
    generate_series(
      (EXTRACT(hour FROM local_dt)::int * 60 + EXTRACT(minute FROM local_dt)::int),
      (EXTRACT(hour FROM local_dt)::int * 60 + EXTRACT(minute FROM local_dt)::int + duration - 15),
      15
    )::int AS minute
  FROM b
)
INSERT INTO "SlotLock" (date, minute, "bookingId")
SELECT day_anchor, minute, booking_id
FROM cells
ON CONFLICT DO NOTHING;
