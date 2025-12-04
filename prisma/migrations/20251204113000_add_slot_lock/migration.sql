-- CreateTable
CREATE TABLE "SlotLock" (
  "id" SERIAL PRIMARY KEY,
  "date" TIMESTAMP NOT NULL,
  "minute" INTEGER NOT NULL,
  "bookingId" INTEGER NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotLock_date_minute_key" ON "SlotLock"("date", "minute");
CREATE INDEX "SlotLock_date_idx" ON "SlotLock"("date");
