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
