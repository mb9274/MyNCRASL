/**
 * Sierra Leone numbers use country code +232 followed by an 8-digit national
 * number (e.g. 076 123 456 → +232 76 123 456). Some legacy/test numbers in
 * this prototype were stored with 9 digits, so both lengths are accepted and
 * preserved to keep those accounts reachable.
 */
export function normalizeSierraLeonePhone(input: string): string | null {
  const raw = input.trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  let national: string | null = null;
  if (hasPlus) {
    if (!digits.startsWith("232")) return null;
    national = digits.slice(3);
  } else if (digits.startsWith("232") && (digits.length === 11 || digits.length === 12)) {
    national = digits.slice(3);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  }

  if (!national) return null;
  // Tolerate a national trunk zero typed after the country code (+232 0...).
  if (national.startsWith("0")) national = national.slice(1);
  if (!/^\d{8,9}$/.test(national)) return null;
  return `+232${national}`;
}

export function displayPhone(phone: string): string {
  if (!phone.startsWith("+232")) return phone;
  const national = phone.slice(4);
  if (national.length === 8) return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  if (national.length === 9) return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  return phone;
}

/**
 * International numbers are kept in E.164-like form (+country code and up to
 * 15 digits). We deliberately do not invent country-specific length rules.
 * Accepts both `+44...` and `0044...` input styles.
 */
export function normalizeInternationalPhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (!raw.startsWith("+") && !raw.startsWith("00")) return null;
  let digits = raw.replace(/\D/g, "");
  // `00` is the international access prefix, not part of the country code.
  if (raw.startsWith("00")) digits = digits.replace(/^00/, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Combines a dial-code field and a national-number field into E.164 form. */
export function normalizeInternationalParts(dialCode: string, nationalNumber: string): string | null {
  const code = dialCode.trim();
  if (!code.startsWith("+") && !code.startsWith("00")) return null;
  const national = nationalNumber.replace(/\D/g, "");
  if (national.length < 4 || national.length > 14) return null;
  return normalizeInternationalPhone(`${code}${national}`);
}

/**
 * Login accepts an international number written with + or 00, a Sierra Leone
 * number in local form, or an email address (handled by the caller).
 */
export function normalizeLoginPhone(identifier: string): string | null {
  const raw = identifier.trim();
  if (raw.startsWith("+") || raw.startsWith("00")) return normalizeInternationalPhone(raw);
  return normalizeSierraLeonePhone(raw);
}

