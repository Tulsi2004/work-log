-- CreateEnum
CREATE TYPE "CalendarKind" AS ENUM ('OWNED', 'HOLIDAY');

-- CreateTable
CREATE TABLE "Calendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "kind" "CalendarKind" NOT NULL DEFAULT 'OWNED',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '(No title)',
    "description" TEXT,
    "location" TEXT,
    "color" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "rrule" TEXT,
    "recurrenceEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventException" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "originalStart" TIMESTAMP(3) NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "color" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "startDate" TEXT,
    "endDate" TEXT,

    CONSTRAINT "EventException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Calendar_userId_idx" ON "Calendar"("userId");

-- CreateIndex
CREATE INDEX "Event_calendarId_startAt_idx" ON "Event"("calendarId", "startAt");

-- CreateIndex
CREATE INDEX "Event_calendarId_startDate_idx" ON "Event"("calendarId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "EventException_eventId_originalStart_key" ON "EventException"("eventId", "originalStart");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventException" ADD CONSTRAINT "EventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

