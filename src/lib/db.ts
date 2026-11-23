import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Application, ApplicationStatus, AuditLog, Language, Notification, Office, Role, User } from "./types";

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
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  `);
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
    passwordHash: String(row.password_hash),
    preferredLanguage: row.preferred_language as Language,
    role: row.role as Role,
    isVerified: Number(row.is_verified) === 1,
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
  passwordHash: string;
  preferredLanguage: Language;
  role?: Role;
}): User & { passwordHash: string } {
  const id = newId("usr");
  const timestamp = now();
  db.prepare(
    `INSERT INTO users (id, phone, email, full_name, password_hash, preferred_language, role, is_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(id, input.phone, input.email, input.fullName, input.passwordHash, input.preferredLanguage, input.role ?? "citizen", timestamp, timestamp);
  return findUserById(id)!;
}

export function updateUser(id: string, changes: Partial<Pick<User, "fullName" | "email" | "preferredLanguage" | "isVerified">>): User | null {
  const existing = findUserById(id);
  if (!existing) return null;
  const fields: string[] = [];
  const values: SQLInputValue[] = [];
  if (changes.fullName !== undefined) { fields.push("full_name = ?"); values.push(changes.fullName); }
  if (changes.email !== undefined) { fields.push("email = ?"); values.push(changes.email); }
  if (changes.preferredLanguage !== undefined) { fields.push("preferred_language = ?"); values.push(changes.preferredLanguage); }
  if (changes.isVerified !== undefined) { fields.push("is_verified = ?"); values.push(changes.isVerified ? 1 : 0); }
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
