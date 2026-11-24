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

export const PERSONAL_FIELDS: ApplicationField[] = [
  { key: "fullName", label: "Full name", type: "text", required: true, autocomplete: "name", hint: "As it appears on your supporting documents" },
  { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
  { key: "placeOfBirth", label: "Place of birth (town and district)", type: "text", required: true, placeholder: "e.g. Kenema, Kenema District" },
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
    options: [
      { value: "Phone call", label: "Phone call" },
      { value: "SMS", label: "SMS" },
      { value: "Email", label: "Email" },
    ],
    unconfirmed: true,
  },
];

export const ALL_FIELDS = [...PERSONAL_FIELDS, ...ADDRESS_FIELDS];

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

export function formatApplicationDate(value: string | null | undefined): string {
  if (!value) return "Not submitted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return `${date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}
