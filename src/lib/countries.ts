/**
 * Product-level country list for the prototype. It is intentionally
 * configurable: it is not a statement about where NCRA operates or which
 * overseas arrangements are authorised.
 */
export interface CountryOption {
  value: string;
  label: string;
  dialCode: string;
  timeZone: string;
  timeZoneNote?: string;
}

export const OTHER_COUNTRY = "Other countries";

export const COUNTRIES: CountryOption[] = [
  { value: "Sierra Leone", label: "Sierra Leone", dialCode: "+232", timeZone: "Africa/Freetown" },
  { value: "United Kingdom", label: "United Kingdom", dialCode: "+44", timeZone: "Europe/London" },
  { value: "United States", label: "United States", dialCode: "+1", timeZone: "America/New_York", timeZoneNote: "The United States has several time zones; times are shown in Eastern Time." },
  { value: "Canada", label: "Canada", dialCode: "+1", timeZone: "America/Toronto", timeZoneNote: "Canada has several time zones; times are shown in Eastern Time." },
  { value: "Germany", label: "Germany", dialCode: "+49", timeZone: "Europe/Berlin" },
  { value: "France", label: "France", dialCode: "+33", timeZone: "Europe/Paris" },
  { value: "Ghana", label: "Ghana", dialCode: "+233", timeZone: "Africa/Accra" },
  { value: "Nigeria", label: "Nigeria", dialCode: "+234", timeZone: "Africa/Lagos" },
  { value: "The Gambia", label: "The Gambia", dialCode: "+220", timeZone: "Africa/Banjul" },
  { value: "Liberia", label: "Liberia", dialCode: "+231", timeZone: "Africa/Monrovia" },
  { value: "Senegal", label: "Senegal", dialCode: "+221", timeZone: "Africa/Dakar" },
  { value: "Guinea", label: "Guinea", dialCode: "+224", timeZone: "Africa/Conakry" },
  { value: "Ethiopia", label: "Ethiopia", dialCode: "+251", timeZone: "Africa/Addis_Ababa" },
  { value: "South Africa", label: "South Africa", dialCode: "+27", timeZone: "Africa/Johannesburg" },
  { value: "Kenya", label: "Kenya", dialCode: "+254", timeZone: "Africa/Nairobi" },
  { value: "Ireland", label: "Ireland", dialCode: "+353", timeZone: "Europe/Dublin" },
  { value: "Netherlands", label: "Netherlands", dialCode: "+31", timeZone: "Europe/Amsterdam" },
  { value: "Belgium", label: "Belgium", dialCode: "+32", timeZone: "Europe/Brussels" },
  { value: "Switzerland", label: "Switzerland", dialCode: "+41", timeZone: "Europe/Zurich" },
  { value: "Italy", label: "Italy", dialCode: "+39", timeZone: "Europe/Rome" },
  { value: "Spain", label: "Spain", dialCode: "+34", timeZone: "Europe/Madrid" },
  { value: "Portugal", label: "Portugal", dialCode: "+351", timeZone: "Europe/Lisbon" },
  { value: "Sweden", label: "Sweden", dialCode: "+46", timeZone: "Europe/Stockholm" },
  { value: "Norway", label: "Norway", dialCode: "+47", timeZone: "Europe/Oslo" },
  { value: "Denmark", label: "Denmark", dialCode: "+45", timeZone: "Europe/Copenhagen" },
  { value: "Finland", label: "Finland", dialCode: "+358", timeZone: "Europe/Helsinki" },
  { value: "Austria", label: "Austria", dialCode: "+43", timeZone: "Europe/Vienna" },
  { value: "Poland", label: "Poland", dialCode: "+48", timeZone: "Europe/Warsaw" },
  { value: "Romania", label: "Romania", dialCode: "+40", timeZone: "Europe/Bucharest" },
  { value: "Turkey", label: "Turkey", dialCode: "+90", timeZone: "Europe/Istanbul" },
  { value: "United Arab Emirates", label: "United Arab Emirates", dialCode: "+971", timeZone: "Asia/Dubai" },
  { value: "Saudi Arabia", label: "Saudi Arabia", dialCode: "+966", timeZone: "Asia/Riyadh" },
  { value: "Qatar", label: "Qatar", dialCode: "+974", timeZone: "Asia/Qatar" },
  { value: "India", label: "India", dialCode: "+91", timeZone: "Asia/Kolkata" },
  { value: "Pakistan", label: "Pakistan", dialCode: "+92", timeZone: "Asia/Karachi" },
  { value: "Bangladesh", label: "Bangladesh", dialCode: "+880", timeZone: "Asia/Dhaka" },
  { value: "Malaysia", label: "Malaysia", dialCode: "+60", timeZone: "Asia/Kuala_Lumpur" },
  { value: "Singapore", label: "Singapore", dialCode: "+65", timeZone: "Asia/Singapore" },
  { value: "Japan", label: "Japan", dialCode: "+81", timeZone: "Asia/Tokyo" },
  { value: "China", label: "China", dialCode: "+86", timeZone: "Asia/Shanghai" },
  { value: "Australia", label: "Australia", dialCode: "+61", timeZone: "Australia/Sydney", timeZoneNote: "Australia has several time zones; times are shown in Sydney time." },
  { value: "New Zealand", label: "New Zealand", dialCode: "+64", timeZone: "Pacific/Auckland" },
  { value: "Brazil", label: "Brazil", dialCode: "+55", timeZone: "America/Sao_Paulo" },
  { value: "Mexico", label: "Mexico", dialCode: "+52", timeZone: "America/Mexico_City" },
  { value: "Jamaica", label: "Jamaica", dialCode: "+876", timeZone: "America/Jamaica" },
  { value: "Trinidad and Tobago", label: "Trinidad and Tobago", dialCode: "+1868", timeZone: "America/Port_of_Spain" },
  { value: "Barbados", label: "Barbados", dialCode: "+1246", timeZone: "America/Barbados" },
  { value: "Cuba", label: "Cuba", dialCode: "+53", timeZone: "America/Havana" },
  { value: "Haiti", label: "Haiti", dialCode: "+509", timeZone: "America/Port-au-Prince" },
  { value: "Dominican Republic", label: "Dominican Republic", dialCode: "+1809", timeZone: "America/Santo_Domingo" },
  { value: OTHER_COUNTRY, label: OTHER_COUNTRY, dialCode: "", timeZone: "UTC", timeZoneNote: "Times are shown in UTC because no country-specific time zone is configured." },
];

const COUNTRY_MAP = new Map(COUNTRIES.map((country) => [country.value, country]));

export function findCountry(value: unknown): CountryOption | null {
  return typeof value === "string" ? COUNTRY_MAP.get(value) ?? null : null;
}

export function dialCodeForCountry(value: unknown): string {
  return findCountry(value)?.dialCode ?? "";
}

export function timeZoneForCountry(value: unknown): string {
  return findCountry(value)?.timeZone ?? "UTC";
}

export function isKnownCountry(value: unknown): boolean {
  return findCountry(value) !== null;
}
