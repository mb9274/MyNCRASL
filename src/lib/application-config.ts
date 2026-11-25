import { COUNTRIES, timeZoneForCountry } from "./countries";
import type { ApplicationStatus } from "./types";

/**
 * Proposed application fields. `required` is a product-level default for the
 * prototype, NOT a claim about official NCRA eligibility or mandatory rules.
 * Set `required: false` / add options once NCRA confirms the official forms.
 */
export interface FieldOption {
  value: string;
  label: string;
}

export interface ApplicationField {
  key: string;
  label: string;
  type: "text" | "date" | "textarea" | "select" | "email" | "tel";
  required: boolean;
  placeholder?: string;
  hint?: string;
  options?: FieldOption[];
  autocomplete?: string;
  /** Marks fields whose official requirement has not been confirmed by NCRA. */
  unconfirmed?: boolean;
}

export const SIERRA_LEONE_DISTRICTS: FieldOption[] = [
  { value: "Kailahun", label: "Kailahun" },
  { value: "Kenema", label: "Kenema" },
  { value: "Kono", label: "Kono" },
  { value: "Moyamba", label: "Moyamba" },
  { value: "Bonthe", label: "Bonthe" },
  { value: "Boom", label: "Boom" },
  { value: "Pujehun", label: "Pujehun" },
  { value: "Western Area Rural", label: "Western Area Rural" },
  { value: "Western Area Urban", label: "Western Area Urban" },
  { value: "Kambia", label: "Kambia" },
  { value: "Koinadugu", label: "Koinadugu" },
  { value: "Port Loko", label: "Port Loko" },
  { value: "Tonkolili", label: "Tonkolili" },
  { value: "Bombali", label: "Bombali" },
  { value: "Kabala", label: "Kabala" },
  { value: "Falaba", label: "Falaba" },
];

export const APPLICATION_LOCATIONS = [
  { value: "in_sierra_leone", label: "I live in Sierra Leone" },
  { value: "abroad", label: "I live outside Sierra Leone" },
] as const;

export type ApplicationLocation = (typeof APPLICATION_LOCATIONS)[number]["value"];

export const LOCATION_FIELD: ApplicationField = {
  key: "applicationLocation",
  label: "Where do you currently live?",
  type: "select",
  required: true,
  options: APPLICATION_LOCATIONS.map((option) => ({ value: option.value, label: option.label })),
  hint: "This changes which address fields you need to complete.",
};

export const COUNTRY_OPTIONS: FieldOption[] = COUNTRIES.map((country) => ({ value: country.value, label: country.label }));

export const ADMIN_COUNTRY_OPTIONS: FieldOption[] = [
  { value: "All countries", label: "All countries (global note)" },
  ...COUNTRY_OPTIONS,
];

export const CONTACT_METHOD_OPTIONS: FieldOption[] = [
  { value: "Phone call", label: "Phone call" },
  { value: "SMS", label: "SMS" },
  { value: "Email", label: "Email" },
  { value: "WhatsApp", label: "WhatsApp" },
];

export const PERSONAL_FIELDS: ApplicationField[] = [
  { key: "fullName", label: "Full name", type: "text", required: true, autocomplete: "name", hint: "As it appears on your supporting documents" },
  { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
  { key: "placeOfBirth", label: "Place of birth (town and district)", type: "text", required: true, placeholder: "e.g. Kenema, Kenema District" },
  {
    key: "countryOfBirth",
    label: "Country of birth",
    type: "select",
    required: true,
    options: COUNTRY_OPTIONS,
    hint: "Kept separate from your place of birth and nationality.",
  },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    required: true,
    options: [
      { value: "Female", label: "Female" },
      { value: "Male", label: "Male" },
      { value: "Other", label: "Other" },
      { value: "Prefer not to say", label: "Prefer not to say" },
    ],
    unconfirmed: true,
  },
  {
    key: "nationality",
    label: "Nationality",
    type: "select",
    required: true,
    options: [
      { value: "Sierra Leonean", label: "Sierra Leonean" },
      { value: "Other", label: "Other" },
    ],
  },
  {
    key: "nationalityOther",
    label: "Please specify nationality",
    type: "text",
    required: false,
    hint: "Only if you selected 'Other' nationality",
  },
  {
    key: "existingIdNumber",
    label: "Existing ID number (if any)",
    type: "text",
    required: false,
    hint: "Optional — may be required after NCRA confirmation",
    unconfirmed: true,
  },
];

export const ADDRESS_FIELDS: ApplicationField[] = [
  { key: "residentialAddress", label: "Residential address", type: "textarea", required: true, placeholder: "Street, house number, area" },
  { key: "district", label: "District", type: "select", required: true, options: SIERRA_LEONE_DISTRICTS },
  { key: "chiefdom", label: "Chiefdom", type: "text", required: true, hint: "Enter the chiefdom for your district" },
  { key: "sectionCommunity", label: "Section or community", type: "text", required: false, hint: "Optional — add if applicable" },
  { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "076 123 456", autocomplete: "tel" },
  { key: "email", label: "Email address", type: "email", required: false, placeholder: "you@example.com", autocomplete: "email" },
  {
    key: "preferredContactMethod",
    label: "Preferred contact method",
    type: "select",
    required: false,
    options: CONTACT_METHOD_OPTIONS,
    unconfirmed: true,
  },
];

export const DIASPORA_FIELDS: ApplicationField[] = [
  {
    key: "countryOfResidence",
    label: "Country of residence",
    type: "select",
    required: true,
    options: COUNTRY_OPTIONS,
    hint: "Your current country. This is not your nationality or country of birth.",
  },
  { key: "overseasAddress", label: "Residential address abroad", type: "textarea", required: true, placeholder: "Street, house or apartment, area" },
  { key: "overseasCity", label: "City or town", type: "text", required: true, placeholder: "e.g. London" },
  {
    key: "internationalDialCode",
    label: "Phone country code",
    type: "tel",
    required: true,
    placeholder: "+44",
    hint: "Include the + sign, for example +44 or +1.",
  },
  {
    key: "internationalNationalNumber",
    label: "Phone number",
    type: "tel",
    required: true,
    placeholder: "7700 900123",
    autocomplete: "tel",
    hint: "Enter the rest of your number without the country code.",
  },
  { key: "email", label: "Email address", type: "email", required: true, placeholder: "you@example.com", autocomplete: "email", hint: "Required for the diaspora prototype so verification can be demonstrated." },
  {
    key: "preferredContactMethod",
    label: "Preferred contact method",
    type: "select",
    required: false,
    options: CONTACT_METHOD_OPTIONS,
    unconfirmed: true,
  },
];

export const SIERRA_LEONE_ORIGIN_FIELDS: ApplicationField[] = [
  { key: "district", label: "District in Sierra Leone (optional)", type: "select", required: false, options: SIERRA_LEONE_DISTRICTS, hint: "Only if you have a Sierra Leone district to provide." },
  { key: "chiefdom", label: "Chiefdom (optional)", type: "text", required: false, hint: "Only if applicable to you." },
  { key: "sectionCommunity", label: "Section or community (optional)", type: "text", required: false },
];

export const ALL_FIELDS: ApplicationField[] = [
  ...PERSONAL_FIELDS,
  ...ADDRESS_FIELDS,
  ...DIASPORA_FIELDS.filter((field) => !["email", "preferredContactMethod"].includes(field.key)),
  ...SIERRA_LEONE_ORIGIN_FIELDS.filter((field) => !ADDRESS_FIELDS.some((local) => local.key === field.key)),
];

export const STATUS_INFO: Record<ApplicationStatus, { label: string; description: string; nextSteps: string[] }> = {
  draft: {
    label: "Draft",
    description: "Your information is saved but not submitted.",
    nextSteps: ["Complete all required fields", "Upload a passport photograph", "Submit the application"],
  },
  submitted: {
    label: "Submitted",
    description: "Your test application has been received by this prototype. It has not been sent to NCRA.",
    nextSteps: ["Wait for a review outcome in this demo", "Keep your reference number", "No visit to an NCRA office is required for this test"],
  },
  under_review: {
    label: "Under Review",
    description: "A reviewer is checking the information you provided.",
    nextSteps: ["Check this page for updates", "Respond if more information is requested"],
  },
  appointment_required: {
    label: "Appointment Required",
    description: "An in-person appointment is needed for verification or biometric capture.",
    nextSteps: ["Wait for appointment instructions", "Attend only at an NCRA-approved office"],
  },
  verification_pending: {
    label: "Verification Pending",
    description: "Additional verification is required before a decision can be made.",
    nextSteps: ["Provide any requested information", "Check back for the verification outcome"],
  },
  approved: {
    label: "Approved",
    description: "The application was approved in this prototype.",
    nextSteps: ["Wait for card processing information", "This is not an official identity decision"],
  },
  rejected: {
    label: "Rejected",
    description: "The application was not approved in this prototype.",
    nextSteps: ["Review the reason given", "Contact support if you believe this is incorrect"],
  },
  card_processing: {
    label: "Card Processing",
    description: "The identity card is being prepared (demo status).",
    nextSteps: ["Wait for collection instructions"],
  },
  ready_for_collection: {
    label: "Ready for Collection",
    description: "The card is ready for collection (demo status).",
    nextSteps: ["Follow the collection instructions shown", "Bring your reference number"],
  },
  completed: {
    label: "Completed",
    description: "The application process is complete in this prototype.",
    nextSteps: ["Keep your reference number for records"],
  },
};

export function applicantsName(formData: Record<string, unknown>): string {
  return typeof formData.fullName === "string" && formData.fullName.trim() ? formData.fullName.trim() : "Applicant";
}

export function isDiaspora(formData: Record<string, unknown>): boolean {
  return formData.applicationLocation === "abroad";
}

export function applicationLocation(formData: Record<string, unknown>): ApplicationLocation {
  return isDiaspora(formData) ? "abroad" : "in_sierra_leone";
}

export function addressFieldsForApplication(formData: Record<string, unknown>): ApplicationField[] {
  return isDiaspora(formData) ? [...DIASPORA_FIELDS, ...SIERRA_LEONE_ORIGIN_FIELDS] : ADDRESS_FIELDS;
}

export function fieldsForApplication(formData: Record<string, unknown>): ApplicationField[] {
  const fields = [...PERSONAL_FIELDS, ...addressFieldsForApplication(formData)];
  if (isDiaspora(formData)) {
    const phoneField = ADDRESS_FIELDS.find((field) => field.key === "phone");
    if (phoneField) fields.push({ ...phoneField, label: "International phone number" });
  }
  return fields;
}

export function countryOfResidence(formData: Record<string, unknown>): string {
  if (typeof formData.countryOfResidence === "string" && formData.countryOfResidence.trim()) return formData.countryOfResidence;
  return "Not provided";
}

export function timeZoneForApplication(formData: Record<string, unknown>): string {
  if (typeof formData.timeZone === "string" && formData.timeZone) return formData.timeZone;
  return timeZoneForCountry(formData.countryOfResidence);
}

export function formatApplicationDate(value: string | null | undefined, timeZone = "UTC"): string {
  if (!value) return "Not submitted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  try {
    return `${date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    })} (${timeZone})`;
  } catch {
    return `${date.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    })} UTC`;
  }
}
