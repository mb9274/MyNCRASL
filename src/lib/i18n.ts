import type { Language } from "./types";

export const LANGUAGE_META: Record<Language, { name: string; nativeName: string; region: string }> = {
  en: { name: "English", nativeName: "English", region: "Official" },
  krio: { name: "Krio", nativeName: "Krio", region: "National lingua franca" },
  mende: { name: "Mende", nativeName: "Mende", region: "Southern / Eastern" },
  temne: { name: "Temne", nativeName: "Temne", region: "Northern" },
  limba: { name: "Limba", nativeName: "Limba", region: "Northern" },
  fula: { name: "Fula", nativeName: "Fulfulde", region: "Northern / Eastern" },
  kono: { name: "Kono", nativeName: "Kono", region: "Eastern" },
  loko: { name: "Loko", nativeName: "Loko", region: "Northern" },
};

const en = {
  appName: "MyNCRA",
  tagline: "One platform. Every Sierra Leonean. Everywhere.",
  demoNotice: "Demonstration platform — not an official NCRA system. No real identity data is processed.",
  home: "Home",
  about: "About",
  services: "Services",
  language: "Language",
  selectLanguage: "Choose your language",
  continue: "Continue",
  back: "Back",
  signIn: "Sign in",
  signOut: "Sign out",
  createAccount: "Create account",
  fullName: "Full name",
  phoneNumber: "Phone number",
  emailOptional: "Email address (optional)",
  password: "Password",
  confirmPassword: "Confirm password",
  accountType: "I am registering as",
  citizen: "Citizen",
  assistant: "Community assistant",
  registerHelp: "Registering someone else? A community assistant account must be approved by NCRA.",
  verifyAccount: "Verify your account",
  verificationHelp: "Enter the 6-digit code sent to your phone or email.",
  verify: "Verify",
  resendCode: "Send a new code",
  dashboard: "My dashboard",
  welcome: "Welcome",
  unverifiedBanner: "Your account is not verified yet. Verify now to submit applications.",
  applyId: "Apply for National ID",
  myApplications: "My applications",
  appointments: "Appointments",
  notifications: "Notifications",
  wallet: "Digital wallet",
  voiceBridge: "VoiceBridge",
  community: "Community Connect",
  diaspora: "Diaspora services",
  civilRegistration: "Civil registration",
  staffPortal: "Staff portal",
  comingSoon: "Coming soon",
  noApplications: "You have no applications yet.",
  basedAbroad: "I am applying from abroad",
  needHelp: "Need help?",
  voiceHelp: "Use VoiceBridge to listen in your language",
  accessibility: "Accessibility",
  secure: "Secure",
  step: "Step",
  invalidInput: "Please check the information you entered.",
  somethingWrong: "Something went wrong. Please try again.",
} as const;

export type TranslationKey = keyof typeof en;

// The platform interface is English-only. Local-language support is delivered through
// VoiceBridge audio (a later feature), not through translated UI text.
export function translate(_language: Language, key: TranslationKey): string {
  return en[key];
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LANGUAGE_META, value);
}
