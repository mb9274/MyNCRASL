import "server-only";
import crypto from "node:crypto";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"] as const;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"] as const;

// Prototype storage key. Production must use a managed secret (NCRA-approved
// encrypted object storage / KMS) — never this development fallback.
const storageKey = crypto
  .createHash("sha256")
  .update(process.env.MYNCRA_STORAGE_KEY || "myncra-development-photo-key-change-me")
  .digest();

export function encryptPhoto(data: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", storageKey, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptPhoto(data: Buffer): Buffer {
  if (data.length < 29) throw new Error("INVALID_PHOTO");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", storageKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/** Validates declared type, size and actual image signature. Returns an error message or null. */
export function validatePhoto(file: { type: string; size: number; bytes: Buffer }): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return "Only JPEG, JPG or PNG photographs are accepted.";
  }
  if (file.size === 0) return "The selected file is empty. Choose a different photograph.";
  if (file.size > PHOTO_MAX_BYTES) return "The photograph must be 5 MB or smaller.";

  const isJpeg = file.bytes.length > 3 && file.bytes[0] === 0xff && file.bytes[1] === 0xd8 && file.bytes[2] === 0xff;
  const isPng =
    file.bytes.length > 8 &&
    file.bytes[0] === 0x89 &&
    file.bytes[1] === 0x50 &&
    file.bytes[2] === 0x4e &&
    file.bytes[3] === 0x47 &&
    file.bytes[4] === 0x0d &&
    file.bytes[5] === 0x0a &&
    file.bytes[6] === 0x1a &&
    file.bytes[7] === 0x0a;
  if (!isJpeg && !isPng) return "That file is not a valid JPEG or PNG image. Choose a different photograph.";

  const declared = file.type.toLowerCase();
  if ((declared === "image/jpeg" || declared === "image/jpg") && !isJpeg) {
    return "The selected file is not a JPEG photograph. Choose a different photograph.";
  }
  if (declared === "image/png" && !isPng) {
    return "The selected file is not a PNG photograph. Choose a different photograph.";
  }
  return null;
}

export function photoStoragePath(applicationId: string): string {
  // A stable logical reference, not a temporary local file path.
  return `db://photos/${applicationId}/${crypto.randomUUID()}`;
}

export function photoChecksum(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function validateSupportingDocument(file: { type: string; size: number; bytes: Buffer }): string | null {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return "Only PDF, JPEG, JPG or PNG supporting documents are accepted.";
  }
  if (file.size === 0) return "The selected document is empty. Choose a different file.";
  if (file.size > DOCUMENT_MAX_BYTES) return "Each supporting document must be 5 MB or smaller.";

  const isJpeg = file.bytes.length > 3 && file.bytes[0] === 0xff && file.bytes[1] === 0xd8 && file.bytes[2] === 0xff;
  const isPng =
    file.bytes.length > 8 &&
    file.bytes[0] === 0x89 &&
    file.bytes[1] === 0x50 &&
    file.bytes[2] === 0x4e &&
    file.bytes[3] === 0x47 &&
    file.bytes[4] === 0x0d &&
    file.bytes[5] === 0x0a &&
    file.bytes[6] === 0x1a &&
    file.bytes[7] === 0x0a;
  const isPdf = file.bytes.subarray(0, 5).toString("latin1") === "%PDF-";

  if (file.type === "application/pdf" && !isPdf) return "The selected file is not a valid PDF document.";
  if ((file.type === "image/jpeg" || file.type === "image/jpg") && !isJpeg) return "The selected file is not a valid JPEG image.";
  if (file.type === "image/png" && !isPng) return "The selected file is not a valid PNG image.";
  if (!isPdf && !isJpeg && !isPng) return "That file is not a supported PDF or image document.";
  return null;
}

export function supportingDocumentStoragePath(applicationId: string): string {
  return `db://documents/${applicationId}/${crypto.randomUUID()}`;
}
