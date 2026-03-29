import type Database from 'better-sqlite3';
import { derivePublicState, deriveSeatsLeft } from '../lib/public-state';
import { computeRegistrationLimitPercent } from '../lib/overbooking';
import type { PublicEventCtaState, RegistrationPublicState } from '../types';

export type TelegramEventListFilter = 'all' | 'open' | 'closed';

export type TelegramEventView = {
  id: number;
  slug: string;
  title: string;
  startsAt: string;
  venueName: string;
  hallName: string;
  address: string;
  capacity: number;
  overbookingPercent: number;
  registrationLimit: number;
  registrationLimitPercent: number;
  seatsTaken: number;
  seatsLeft: number;
  registrationPublicState: RegistrationPublicState;
  publicState: PublicEventCtaState;
};

type EventRow = {
  id: number;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue_name: string;
  hall_name: string;
  address: string;
  capacity: number;
  overbooking_percent: number;
  registration_limit: number;
  seats_taken: number;
  registration_public_state: RegistrationPublicState;
  registration_opens_at: string | null;
};

function toView(row: EventRow): TelegramEventView {
  const publicState = derivePublicState(row);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.starts_at,
    venueName: row.venue_name,
    hallName: row.hall_name,
    address: row.address,
    capacity: row.capacity,
    overbookingPercent: row.overbooking_percent,
    registrationLimit: row.registration_limit,
    registrationLimitPercent: computeRegistrationLimitPercent(row.overbooking_percent),
    seatsTaken: row.seats_taken,
    seatsLeft: deriveSeatsLeft(row),
    registrationPublicState: row.registration_public_state,
    publicState,
  };
}

function listAllRows(db: Database.Database) {
  return db.prepare(`
    SELECT
      id,
      slug,
      title,
      starts_at,
      ends_at,
      venue_name,
      hall_name,
      address,
      capacity,
      overbooking_percent,
      registration_limit,
      seats_taken,
      registration_public_state,
      registration_opens_at
    FROM events
    ORDER BY starts_at ASC, title ASC
  `).all() as EventRow[];
}

export function listTelegramEvents(db: Database.Database, filter: TelegramEventListFilter) {
  return listAllRows(db)
    .map(toView)
    .filter((event) => {
      if (filter === 'all') {
        return true;
      }

      if (filter === 'open') {
        return event.publicState === 'registration_open';
      }

      if (filter === 'closed') {
        return event.publicState !== 'registration_open' && event.publicState !== 'past' && event.publicState !== 'sold_out';
      }

      return true;
    });
}

export function getTelegramEventById(db: Database.Database, eventId: number) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      title,
      starts_at,
      ends_at,
      venue_name,
      hall_name,
      address,
      capacity,
      overbooking_percent,
      registration_limit,
      seats_taken,
      registration_public_state,
      registration_opens_at
    FROM events
    WHERE id = ?
    LIMIT 1
  `).get(eventId) as EventRow | undefined;

  return row ? toView(row) : null;
}

export function getTelegramEventBySlug(db: Database.Database, slug: string) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      title,
      starts_at,
      ends_at,
      venue_name,
      hall_name,
      address,
      capacity,
      overbooking_percent,
      registration_limit,
      seats_taken,
      registration_public_state,
      registration_opens_at
    FROM events
    WHERE slug = ?
    LIMIT 1
  `).get(slug) as EventRow | undefined;

  return row ? toView(row) : null;
}

export function setTelegramEventRegistrationState(
  db: Database.Database,
  eventId: number,
  nextState: RegistrationPublicState,
) {
  db.prepare(`
    UPDATE events
    SET registration_public_state = ?,
        updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?
  `).run(nextState, eventId);

  return getTelegramEventById(db, eventId);
}
