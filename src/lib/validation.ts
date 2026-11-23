export function normalizeSierraLeonePhone(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(digits)) return `+232${digits.slice(1)}`;
  if (/^232\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\+232\d{9}$/.test(digits)) return digits;
  return null;
}

export function displayPhone(phone: string): string {
  if (!phone.startsWith("+232") || phone.length !== 13) return phone;
  return `0${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}`;
}
