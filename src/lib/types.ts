export const LANGUAGES = ["en", "krio", "mende", "temne", "limba", "fula", "kono", "loko"] as const;

export type Language = (typeof LANGUAGES)[number];

export const ROLES = ["citizen", "assistant", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "appointment_required",
  "verification_pending",
  "approved",
  "rejected",
  "card_processing",
  "ready_for_collection",
  "completed",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  preferredLanguage: Language;
  role: Role;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SessionUser = User;

export interface Application {
  id: string;
  reference: string;
  userId: string;
  type: string;
  status: ApplicationStatus;
  formData: Record<string, unknown>;
  officeId: string | null;
  appointmentAt: string | null;
  submittedAt: string | null;
  photoDocumentId: string | null;
  photoStoragePath: string | null;
  photoOriginalName: string | null;
  photoMimeType: string | null;
  photoSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  applicationId: string;
  userId: string;
  docType: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  isActive: boolean;
  createdAt: string;
  content?: Buffer;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface Office {
  id: string;
  name: string;
  district: string;
  region: string;
  address: string;
  phone: string | null;
  openingHours: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  applicationId: string | null;
  title: string;
  body: string;
  channel: "in_app" | "sms" | "email";
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}
