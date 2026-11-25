import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  AuditLog,
  DocumentRecord,
  Language,
  Notification,
  NotificationOutbox,
  Office,
  OverseasArrangement,
  Role,
  User,
} from "./types";

type Db = DatabaseSync;

const globalForDb = globalThis as unknown as { myNcraDb?: Db };

function openDb(dbPath: string): Db {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000; PRAGMA synchronous = NORMAL;");
  migrate(database);
  seedOffices(database);
  return database;
}

function createDb(): Db {
  // Vercel serverless functions have a read-only filesystem except for /tmp.
  // Using process.cwd() there throws and takes down every page with a 500.
  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const dbPath = process.env.MYNCRA_DB_PATH || (onVercel ? path.join(os.tmpdir(), "myncra.db") : path.join(process.cwd(), "data", "myncra.db"));
  try {
    return openDb(dbPath);
  } catch (error) {
    // Last-resort fallback so the site still renders even if the filesystem or
    // SQLite is unavailable. Data is not persisted in this mode.
    console.warn("[MyNCRA] SQLite unavailable; using in-memory database:", error);
    return openDb(":memory:");
  }
}

export const db: Db = globalForDb.myNcraDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.myNcraDb = db;

function migrate(database: Db) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      role TEXT NOT NULL DEFAULT 'citizen',
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      district TEXT NOT NULL,
      region TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      opening_hours TEXT
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      form_data TEXT NOT NULL DEFAULT '{}',
      office_id TEXT REFERENCES offices(id),
      appointment_at TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id),
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      office_id TEXT NOT NULL REFERENCES offices(id),
      starts_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'in_app',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_outbox (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued_not_sent',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overseas_arrangements (
      id TEXT PRIMARY KEY,
      country TEXT NOT NULL,
      location_name TEXT NOT NULL,
      location_type TEXT NOT NULL,
      appointment_availability TEXT NOT NULL,
      verification_instructions TEXT NOT NULL,
      collection_instructions TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voice_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      transcript TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      confidence REAL NOT NULL,
      needs_human INTEGER NOT NULL DEFAULT 0,
      audio_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_user ON notification_outbox(user_id);
    CREATE INDEX IF NOT EXISTS idx_arrangements_country ON overseas_arrangements(country);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  `);

  // Additive migrations. Existing records are never rewritten or removed.
  ensureColumn(database, "users", "country_of_residence", "TEXT");
  ensureColumn(database, "users", "email_verified", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "documents", "storage_path", "TEXT");
  ensureColumn(database, "documents", "content", "BLOB");
  ensureColumn(database, "documents", "checksum", "TEXT");
  ensureColumn(database, "documents", "is_active", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(database, "applications", "photo_document_id", "TEXT");
  ensureColumn(database, "applications", "photo_storage_path", "TEXT");
  ensureColumn(database, "applications", "photo_original_name", "TEXT");
  ensureColumn(database, "applications", "photo_mime_type", "TEXT");
  ensureColumn(database, "applications", "photo_size_bytes", "INTEGER");
}

function ensureColumn(database: Db, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((entry) => entry.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function seedOffices(database: Db) {
  const count = database.prepare("SELECT COUNT(*) AS n FROM offices").get() as { n: number };
  if (count.n > 0) return;
  const offices = [
    ["office-freetown", "Freetown National Registration Centre", "Freetown", "Western Area", "13 Mahdi Lane, Freetown", "+232 22 224 991", "Mon-Fri 08:00-16:00"],
    ["office-boom", "Boom District Registration Office", "Boom", "Southern", "Boom Town, Boom District", null, "Mon-Fri 08:30-15:30"],
    ["office-kenema", "Kenema District Registration Office", "Kenema", "Eastern", "Kenema Town, Kenema District", null, "Mon-Fri 08:30-15:30"],
    ["office-makeni", "Makeni District Registration Office", "Makeni", "Northern", "Makeni Town, Bombali District", null, "Mon-Fri 08:30-15:30"],
    ["office-kabala", "Kabala District Registration Office", "Kabala", "Northern", "Kabala Town, Koinadugu District", null, "Mon-Fri 08:30-15:30"],
  ];
  const insert = database.prepare(
    "INSERT INTO offices (id, name, district, region, address, phone, opening_hours) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const office of offices) insert.run(...office);
}

export function now(): string {
  return new Date().toISOString();
}

export function newId(prefix = ""): string {
  const id = globalThis.crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

type UserWithHash = User & { passwordHash: string };

function toUser(row: Record<string, unknown>): UserWithHash {
  return {
    id: String(row.id),
    phone: String(row.phone),
    email: row.email ? String(row.email) : null,
    fullName: String(row.full_name),
    countryOfResidence: row.country_of_residence ? String(row.country_of_residence) : null,
    passwordHash: String(row.password_hash),
    preferredLanguage: row.preferred_language as Language,
    role: row.role as Role,
    isVerified: Number(row.is_verified) === 1,
    emailVerified: Number(row.email_verified ?? 0) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function findUserById(id: string): (User & { passwordHash: string }) | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function findUserByPhone(phone: string): (User & { passwordHash: string }) | null {
  const row = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function createUser(input: {
  phone: string;
  email: string | null;
  fullName: string;
  countryOfResidence?: string | null;
  passwordHash: string;
  preferredLanguage: Language;
  role?: Role;
}): User & { passwordHash: string } {
  const id = newId("usr");
  const timestamp = now();
  db.prepare(
    `INSERT INTO users (id, phone, email, full_name, country_of_residence, password_hash, preferred_language, role, is_verified, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
  ).run(
    id, input.phone, input.email, input.fullName, input.countryOfResidence ?? null,
    input.passwordHash, input.preferredLanguage, input.role ?? "citizen", timestamp, timestamp,
  );
  return findUserById(id)!;
}

export function updateUser(
  id: string,
  changes: Partial<Pick<User, "fullName" | "email" | "countryOfResidence" | "preferredLanguage" | "isVerified" | "emailVerified">>,
): User | null {
  const existing = findUserById(id);
  if (!existing) return null;
  const fields: string[] = [];
  const values: SQLInputValue[] = [];
  if (changes.fullName !== undefined) { fields.push("full_name = ?"); values.push(changes.fullName); }
  if (changes.email !== undefined) { fields.push("email = ?"); values.push(changes.email); }
  if (changes.countryOfResidence !== undefined) { fields.push("country_of_residence = ?"); values.push(changes.countryOfResidence); }
  if (changes.preferredLanguage !== undefined) { fields.push("preferred_language = ?"); values.push(changes.preferredLanguage); }
  if (changes.isVerified !== undefined) { fields.push("is_verified = ?"); values.push(changes.isVerified ? 1 : 0); }
  if (changes.emailVerified !== undefined) { fields.push("email_verified = ?"); values.push(changes.emailVerified ? 1 : 0); }
  if (fields.length === 0) return existing;
  fields.push("updated_at = ?");
  values.push(now(), id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return findUserById(id);
}

export function createSession(userId: string, tokenHash: string, expiresAt: string): void {
  db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
    newId("ses"), userId, tokenHash, expiresAt, now(),
  );
}

export function findSessionByTokenHash(tokenHash: string): { user_id: string; expires_at: string } | null {
  const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(tokenHash) as
    | { user_id: string; expires_at: string }
    | undefined;
  return row ?? null;
}

export function deleteSessionByTokenHash(tokenHash: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function deleteExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now());
}

export function saveVerificationCode(userId: string, purpose: string, codeHash: string, expiresAt: string): void {
  db.prepare("INSERT INTO verification_codes (id, user_id, purpose, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    newId("vcode"), userId, purpose, codeHash, expiresAt, now(),
  );
}

export function findVerificationCode(userId: string, purpose: string, codeHash: string): { id: string; expires_at: string } | null {
  const row = db.prepare(
    "SELECT id, expires_at FROM verification_codes WHERE user_id = ? AND purpose = ? AND code_hash = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
  ).get(userId, purpose, codeHash) as { id: string; expires_at: string } | undefined;
  return row ?? null;
}

export function markVerificationCodeUsed(id: string): void {
  db.prepare("UPDATE verification_codes SET used_at = ? WHERE id = ?").run(now(), id);
}

export function generateReference(): string {
  const year = new Date().getFullYear();
  let reference: string;
  let exists = true;
  do {
    const part = globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    reference = `NCRA-${year}-${part}`;
    exists = Boolean(db.prepare("SELECT 1 FROM applications WHERE reference = ?").get(reference));
  } while (exists);
  return reference;
}

export function toApplication(row: Record<string, unknown>): Application {
  return {
    id: String(row.id),
    reference: String(row.reference),
    userId: String(row.user_id),
    type: String(row.type),
    status: row.status as ApplicationStatus,
    formData: JSON.parse(String(row.form_data || "{}")) as Record<string, unknown>,
    officeId: row.office_id ? String(row.office_id) : null,
    appointmentAt: row.appointment_at ? String(row.appointment_at) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    photoDocumentId: row.photo_document_id ? String(row.photo_document_id) : null,
    photoStoragePath: row.photo_storage_path ? String(row.photo_storage_path) : null,
    photoOriginalName: row.photo_original_name ? String(row.photo_original_name) : null,
    photoMimeType: row.photo_mime_type ? String(row.photo_mime_type) : null,
    photoSizeBytes: row.photo_size_bytes === null || row.photo_size_bytes === undefined ? null : Number(row.photo_size_bytes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listOffices(): Office[] {
  const rows = db.prepare("SELECT * FROM offices ORDER BY name").all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    district: String(row.district),
    region: String(row.region),
    address: String(row.address),
    phone: row.phone ? String(row.phone) : null,
    openingHours: row.opening_hours ? String(row.opening_hours) : null,
  }));
}

export function findOfficeById(id: string): Office | null {
  const row = db.prepare("SELECT * FROM offices WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id), name: String(row.name), district: String(row.district), region: String(row.region),
    address: String(row.address), phone: row.phone ? String(row.phone) : null,
    openingHours: row.opening_hours ? String(row.opening_hours) : null,
  };
}

export function addNotification(input: {
  userId: string;
  applicationId?: string | null;
  title: string;
  body: string;
  channel?: Notification["channel"];
}): Notification {
  const id = newId("ntf");
  db.prepare(
    "INSERT INTO notifications (id, user_id, application_id, title, body, channel, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
  ).run(id, input.userId, input.applicationId ?? null, input.title, input.body, input.channel ?? "in_app", now());
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id) as Record<string, unknown>;
  return {
    id: String(row.id), userId: String(row.user_id), applicationId: row.application_id ? String(row.application_id) : null,
    title: String(row.title), body: String(row.body), channel: row.channel as Notification["channel"],
    isRead: Number(row.is_read) === 1, createdAt: String(row.created_at),
  };
}

export function listNotifications(userId: string): Notification[] {
  const rows = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id), userId: String(row.user_id), applicationId: row.application_id ? String(row.application_id) : null,
    title: String(row.title), body: String(row.body), channel: row.channel as Notification["channel"],
    isRead: Number(row.is_read) === 1, createdAt: String(row.created_at),
  }));
}

export function markNotificationRead(id: string, userId: string): void {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(id, userId);
}

/** Records an intended message without sending it. Prototype only. */
export function addNotificationOutbox(input: {
  userId: string;
  applicationId?: string | null;
  channel: NotificationOutbox["channel"];
  recipient: string;
  title: string;
  body: string;
}): NotificationOutbox {
  const id = newId("out");
  db.prepare(
    `INSERT INTO notification_outbox (id, user_id, application_id, channel, recipient, title, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'queued_not_sent', ?)`,
  ).run(
    id, input.userId, input.applicationId ?? null, input.channel,
    input.recipient, input.title, input.body, now(),
  );
  const row = db.prepare("SELECT * FROM notification_outbox WHERE id = ?").get(id) as Record<string, unknown>;
  return {
    id: String(row.id), userId: String(row.user_id),
    applicationId: row.application_id ? String(row.application_id) : null,
    channel: row.channel as NotificationOutbox["channel"], recipient: String(row.recipient),
    title: String(row.title), body: String(row.body), status: "queued_not_sent", createdAt: String(row.created_at),
  };
}

export function listNotificationOutbox(userId: string, applicationId?: string): NotificationOutbox[] {
  const rows = applicationId
    ? db.prepare("SELECT * FROM notification_outbox WHERE user_id = ? AND application_id = ? ORDER BY created_at DESC LIMIT 50").all(userId, applicationId) as Record<string, unknown>[]
    : db.prepare("SELECT * FROM notification_outbox WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id), userId: String(row.user_id),
    applicationId: row.application_id ? String(row.application_id) : null,
    channel: row.channel as NotificationOutbox["channel"], recipient: String(row.recipient),
    title: String(row.title), body: String(row.body), status: "queued_not_sent", createdAt: String(row.created_at),
  }));
}

function toArrangement(row: Record<string, unknown>): OverseasArrangement {
  return {
    id: String(row.id), country: String(row.country), locationName: String(row.location_name),
    locationType: String(row.location_type), appointmentAvailability: String(row.appointment_availability),
    verificationInstructions: String(row.verification_instructions),
    collectionInstructions: String(row.collection_instructions),
    isActive: Number(row.is_active) === 1,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export function listOverseasArrangements(country?: string): OverseasArrangement[] {
  const rows = country
    ? db.prepare(
        `SELECT * FROM overseas_arrangements
         WHERE is_active = 1 AND (country = ? OR country = 'All countries')
         ORDER BY CASE WHEN country = ? THEN 0 ELSE 1 END, location_name`,
      ).all(country, country) as Record<string, unknown>[]
    : db.prepare("SELECT * FROM overseas_arrangements WHERE is_active = 1 ORDER BY country, location_name").all() as Record<string, unknown>[];
  return rows.map(toArrangement);
}

export function listAllOverseasArrangements(): OverseasArrangement[] {
  const rows = db.prepare("SELECT * FROM overseas_arrangements ORDER BY country, location_name").all() as Record<string, unknown>[];
  return rows.map(toArrangement);
}

export function findOverseasArrangement(id: string): OverseasArrangement | null {
  const row = db.prepare("SELECT * FROM overseas_arrangements WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? toArrangement(row) : null;
}

export function saveOverseasArrangement(input: {
  id?: string | null;
  country: string;
  locationName: string;
  locationType: string;
  appointmentAvailability: string;
  verificationInstructions: string;
  collectionInstructions: string;
  isActive: boolean;
  updatedBy: string;
}): OverseasArrangement {
  const timestamp = now();
  if (input.id) {
    const existing = findOverseasArrangement(input.id);
    if (!existing) throw new Error("NOT_FOUND");
    db.prepare(
      `UPDATE overseas_arrangements SET country = ?, location_name = ?, location_type = ?, appointment_availability = ?,
       verification_instructions = ?, collection_instructions = ?, is_active = ?, updated_by = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      input.country, input.locationName, input.locationType, input.appointmentAvailability,
      input.verificationInstructions, input.collectionInstructions, input.isActive ? 1 : 0,
      input.updatedBy, timestamp, input.id,
    );
    return findOverseasArrangement(input.id)!;
  }
  const id = newId("arr");
  db.prepare(
    `INSERT INTO overseas_arrangements (id, country, location_name, location_type, appointment_availability,
     verification_instructions, collection_instructions, is_active, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, input.country, input.locationName, input.locationType, input.appointmentAvailability,
    input.verificationInstructions, input.collectionInstructions, input.isActive ? 1 : 0,
    input.updatedBy, timestamp, timestamp,
  );
  return findOverseasArrangement(id)!;
}

export function deactivateOverseasArrangement(id: string, actorId: string): boolean {
  const result = db.prepare(
    "UPDATE overseas_arrangements SET is_active = 0, updated_by = ?, updated_at = ? WHERE id = ?",
  ).run(actorId, now(), id);
  return result.changes > 0;
}

export function addAuditLog(input: {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
}): void {
  db.prepare(
    "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(newId("aud"), input.actorId ?? null, input.action, input.targetType ?? null, input.targetId ?? null, input.detail ?? null, now());
}

export function listAuditLogs(limit = 100): AuditLog[] {
  const rows = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?").all(limit) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id), actorId: row.actor_id ? String(row.actor_id) : null, action: String(row.action),
    targetType: row.target_type ? String(row.target_type) : null, targetId: row.target_id ? String(row.target_id) : null,
    detail: row.detail ? String(row.detail) : null, createdAt: String(row.created_at),
  }));
}

/* -------------------------------------------------------------------------- */
/* National ID applications — all lookups are scoped to the authenticated user */
/* -------------------------------------------------------------------------- */

export function findDraftApplication(userId: string, type = "national_id"): Application | null {
  const row = db.prepare(
    "SELECT * FROM applications WHERE user_id = ? AND type = ? AND status = 'draft' ORDER BY updated_at DESC LIMIT 1",
  ).get(userId, type) as Record<string, unknown> | undefined;
  return row ? toApplication(row) : null;
}

export function findApplicationForUser(userId: string, applicationId: string): Application | null {
  const row = db.prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?").get(applicationId, userId) as
    | Record<string, unknown>
    | undefined;
  return row ? toApplication(row) : null;
}

/** Admin-only lookup. Callers must check the acting user's role first. */
export function findApplicationById(applicationId: string): Application | null {
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId) as Record<string, unknown> | undefined;
  return row ? toApplication(row) : null;
}

export function listAllApplications(): Application[] {
  const rows = db.prepare("SELECT * FROM applications ORDER BY updated_at DESC").all() as Record<string, unknown>[];
  return rows.map(toApplication);
}

export function listApplicationsForUser(userId: string): Application[] {
  const rows = db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as Record<string, unknown>[];
  return rows.map(toApplication);
}

export function createDraftApplication(userId: string, formData: Record<string, unknown>, type = "national_id"): Application {
  const id = newId("app");
  const timestamp = now();
  db.prepare(
    `INSERT INTO applications (id, reference, user_id, type, status, form_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`,
  ).run(id, generateReference(), userId, type, JSON.stringify(formData), timestamp, timestamp);
  addApplicationEvent(id, null, "draft", userId, "Draft created");
  return findApplicationForUser(userId, id)!;
}

export function updateDraftForm(userId: string, applicationId: string, formData: Record<string, unknown>): Application | null {
  const result = db.prepare(
    "UPDATE applications SET form_data = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'draft'",
  ).run(JSON.stringify(formData), now(), applicationId, userId);
  if (result.changes === 0) return null;
  return findApplicationForUser(userId, applicationId);
}

export function addApplicationEvent(
  applicationId: string,
  fromStatus: ApplicationStatus | null,
  toStatus: ApplicationStatus,
  actorId: string | null,
  note: string | null,
): void {
  db.prepare(
    "INSERT INTO application_events (id, application_id, from_status, to_status, actor_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(newId("aev"), applicationId, fromStatus, toStatus, actorId, note, now());
}

export function listApplicationEvents(userId: string, applicationId: string): ApplicationEvent[] {
  const rows = db.prepare(
    `SELECT e.* FROM application_events e
     JOIN applications a ON a.id = e.application_id
     WHERE e.application_id = ? AND a.user_id = ? ORDER BY e.created_at ASC`,
  ).all(applicationId, userId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    applicationId: String(row.application_id),
    fromStatus: row.from_status ? (row.from_status as ApplicationStatus) : null,
    toStatus: row.to_status as ApplicationStatus,
    actorId: row.actor_id ? String(row.actor_id) : null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
  }));
}

function toDocument(row: Record<string, unknown>, includeContent = false): DocumentRecord {
  const document: DocumentRecord = {
    id: String(row.id),
    applicationId: String(row.application_id),
    userId: String(row.user_id),
    docType: String(row.doc_type),
    originalName: String(row.original_name),
    storagePath: String(row.storage_path ?? ""),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    checksum: row.checksum ? String(row.checksum) : null,
    isActive: Number(row.is_active ?? 1) === 1,
    createdAt: String(row.created_at),
  };
  if (includeContent) document.content = row.content ? Buffer.from(row.content as Uint8Array) : Buffer.alloc(0);
  return document;
}

export function saveApplicationPhoto(input: {
  userId: string;
  applicationId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  checksum: string;
  content: Buffer;
}): DocumentRecord | null {
  const application = findApplicationForUser(input.userId, input.applicationId);
  if (!application || application.status !== "draft") return null;

  let saved: DocumentRecord | null = null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE documents SET is_active = 0 WHERE application_id = ? AND doc_type = 'passport_photo'").run(input.applicationId);
    const id = newId("doc");
    db.prepare(
      `INSERT INTO documents (id, application_id, user_id, doc_type, original_name, stored_name, storage_path, mime_type, size_bytes, checksum, content, is_active, created_at)
       VALUES (?, ?, ?, 'passport_photo', ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).run(id, input.applicationId, input.userId, input.originalName, input.storagePath, input.storagePath, input.mimeType, input.sizeBytes, input.checksum, input.content, now());
    db.prepare(
      `UPDATE applications SET photo_document_id = ?, photo_storage_path = ?, photo_original_name = ?, photo_mime_type = ?, photo_size_bytes = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND status = 'draft'`,
    ).run(id, input.storagePath, input.originalName, input.mimeType, input.sizeBytes, now(), input.applicationId, input.userId);
    const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown>;
    saved = toDocument(row);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return saved;
}

export function getApplicationPhoto(userId: string, applicationId: string): DocumentRecord | null {
  const row = db.prepare(
    `SELECT d.* FROM documents d
     JOIN applications a ON a.id = d.application_id
     WHERE d.application_id = ? AND a.user_id = ? AND d.doc_type = 'passport_photo' AND d.is_active = 1
     ORDER BY d.created_at DESC LIMIT 1`,
  ).get(applicationId, userId) as Record<string, unknown> | undefined;
  return row ? toDocument(row, true) : null;
}

export function removeApplicationPhoto(userId: string, applicationId: string): boolean {
  const application = findApplicationForUser(userId, applicationId);
  if (!application || application.status !== "draft") return false;
  const result = db.prepare(
    `UPDATE documents SET is_active = 0 WHERE application_id = ? AND user_id = ? AND doc_type = 'passport_photo' AND is_active = 1`,
  ).run(applicationId, userId);
  db.prepare(
    `UPDATE applications SET photo_document_id = NULL, photo_storage_path = NULL, photo_original_name = NULL, photo_mime_type = NULL, photo_size_bytes = NULL, updated_at = ?
     WHERE id = ? AND user_id = ? AND status = 'draft'`,
  ).run(now(), applicationId, userId);
  return result.changes > 0;
}

export const SUPPORTING_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"] as const;

export function saveSupportingDocument(input: {
  userId: string;
  applicationId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  checksum: string;
  content: Buffer;
}): DocumentRecord | null {
  const application = findApplicationForUser(input.userId, input.applicationId);
  if (!application || application.status !== "draft") return null;
  const id = newId("doc");
  db.prepare(
    `INSERT INTO documents (id, application_id, user_id, doc_type, original_name, stored_name, storage_path,
     mime_type, size_bytes, checksum, content, is_active, created_at)
     VALUES (?, ?, ?, 'supporting_document', ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    id, input.applicationId, input.userId, input.originalName, input.storagePath, input.storagePath,
    input.mimeType, input.sizeBytes, input.checksum, input.content, now(),
  );
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown>;
  addAuditLog({
    actorId: input.userId, action: "document.uploaded", targetType: "application",
    targetId: input.applicationId, detail: `supporting_document=${id}`,
  });
  return toDocument(row);
}

export function listSupportingDocuments(userId: string, applicationId: string): DocumentRecord[] {
  const rows = db.prepare(
    `SELECT d.* FROM documents d
     JOIN applications a ON a.id = d.application_id
     WHERE d.application_id = ? AND a.user_id = ? AND d.doc_type = 'supporting_document' AND d.is_active = 1
     ORDER BY d.created_at ASC`,
  ).all(applicationId, userId) as Record<string, unknown>[];
  return rows.map((row) => toDocument(row));
}

export function getSupportingDocument(userId: string, applicationId: string, documentId: string): DocumentRecord | null {
  const row = db.prepare(
    `SELECT d.* FROM documents d
     JOIN applications a ON a.id = d.application_id
     WHERE d.application_id = ? AND d.user_id = ? AND a.user_id = ? AND d.id = ?
     AND d.doc_type = 'supporting_document' AND d.is_active = 1`,
  ).get(applicationId, userId, userId, documentId) as Record<string, unknown> | undefined;
  return row ? toDocument(row, true) : null;
}

export function removeSupportingDocument(userId: string, applicationId: string, documentId: string): boolean {
  const application = findApplicationForUser(userId, applicationId);
  if (!application || application.status !== "draft") return false;
  const result = db.prepare(
    `UPDATE documents SET is_active = 0 WHERE id = ? AND application_id = ? AND user_id = ?
     AND doc_type = 'supporting_document' AND is_active = 1`,
  ).run(documentId, applicationId, userId);
  return result.changes > 0;
}

/** Prototype-only queue. No SMS, WhatsApp or email gateway is connected. */
function queuePrototypeMessages(userId: string, application: Application, title: string): void {
  const user = findUserById(userId);
  const body = `${title}: application ${application.reference}. This is a queued prototype message; nothing was delivered.`;
  if (user?.email) {
    addNotificationOutbox({ userId, applicationId: application.id, channel: "email", recipient: user.email, title, body });
  }
  if (user?.phone) {
    addNotificationOutbox({ userId, applicationId: application.id, channel: "whatsapp", recipient: user.phone, title, body });
  }
}

/** Finalises a draft. Reference and status are changed atomically; repeat calls are idempotent. */
export function submitApplication(userId: string, applicationId: string, formData: Record<string, unknown>): Application | null {
  const current = findApplicationForUser(userId, applicationId);
  if (!current) return null;
  if (current.status !== "draft") return current; // prevents duplicate submissions

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `UPDATE applications SET form_data = ?, status = 'submitted', submitted_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND status = 'draft'`,
    ).run(JSON.stringify(formData), now(), now(), applicationId, userId);
    addApplicationEvent(applicationId, "draft", "submitted", userId, "Test application submitted in prototype");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const submitted = findApplicationForUser(userId, applicationId)!;
  addNotification({
    userId,
    applicationId,
    title: "Test application submitted",
    body: `Your application ${submitted.reference} was received in this prototype. It has not been sent to NCRA.`,
  });
  queuePrototypeMessages(userId, submitted, "Test application submitted");
  addAuditLog({
    actorId: userId,
    action: "application.submitted",
    targetType: "application",
    targetId: applicationId,
    detail: `reference=${submitted.reference} (prototype, not sent to NCRA)`,
  });
  return submitted;
}

/** Demo-only workflow control for authorised administrators. */
export function setApplicationStatusAsAdmin(
  applicationId: string,
  input: { status: ApplicationStatus; note: string; actorId: string },
): Application | null {
  const current = findApplicationById(applicationId);
  if (!current) return null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?").run(input.status, now(), applicationId);
    addApplicationEvent(applicationId, current.status, input.status, input.actorId, input.note);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const updated = findApplicationById(applicationId)!;
  const info = `Prototype status change: ${input.status.replaceAll("_", " ")}${input.note ? ` — ${input.note}` : ""}`;
  addNotification({
    userId: updated.userId,
    applicationId,
    title: "Application update in prototype",
    body: info,
  });
  queuePrototypeMessages(updated.userId, updated, "Application update in prototype");
  addAuditLog({
    actorId: input.actorId, action: "application.status_changed", targetType: "application",
    targetId: applicationId, detail: `${current.status} -> ${input.status} (prototype)`,
  });
  return updated;
}
