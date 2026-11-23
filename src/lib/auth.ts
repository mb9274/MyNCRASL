import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { addAuditLog, createSession, deleteExpiredSessions, deleteSessionByTokenHash, findSessionByTokenHash, findUserById } from "./db";
import { isLanguage } from "./i18n";
import type { Language, User } from "./types";

export const LANGUAGE_COOKIE = "myncra_lang";

const COOKIE_NAME = "myncra_session";
const SESSION_DAYS = 7;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, salt, expected] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash("sha256").update(`verify:${code}`).digest("hex");
}

export async function createUserSession(userId: string): Promise<void> {
  deleteExpiredSessions();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  createSession(userId, hashToken(token), expiresAt);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = findSessionByTokenHash(hashToken(token));
  if (!session || session.expires_at < new Date().toISOString()) return null;
  const user = findUserById(session.user_id);
  if (!user) return null;
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    fullName: user.fullName,
    preferredLanguage: user.preferredLanguage,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getLanguagePreference(): Promise<Language> {
  const user = await getCurrentUser();
  if (user) return user.preferredLanguage;
  const jar = await cookies();
  const value = jar.get(LANGUAGE_COOKIE)?.value;
  return isLanguage(value) ? value : "en";
}

export async function setAnonymousLanguage(language: Language): Promise<void> {
  const jar = await cookies();
  jar.set(LANGUAGE_COOKIE, language, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireRole(roles: User["role"][]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function destroyUserSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) deleteSessionByTokenHash(hashToken(token));
  jar.delete(COOKIE_NAME);
}

export function audit(action: string, actorId?: string | null, detail?: string | null, targetType?: string, targetId?: string) {
  addAuditLog({ action, actorId, detail, targetType, targetId });
}
