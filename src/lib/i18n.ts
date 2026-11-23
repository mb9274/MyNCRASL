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

const krio: Partial<Record<TranslationKey, string>> = {
  appName: "MyNCRA",
  tagline: "Wan platifòm. Ɛvri Sierra Leonean. Ɛvriwie.",
  demoNotice: "Dis na dimonstreshon platifòm — i no bi ofishal NCRA sistim.",
  home: "Hom",
  about: "Baut",
  services: "Savis",
  language: "Lengwij",
  selectLanguage: "Pik yu lengwij",
  continue: "Kontinue",
  back: "Bak",
  signIn: "Log in",
  signOut: "Kom out",
  createAccount: "Mek akkaunt",
  fullName: "Ful nem",
  phoneNumber: "Fon noma",
  emailOptional: "Imel (if yu gɛt wan)",
  password: "Paswod",
  confirmPassword: "Kɔnfɔm paswod",
  citizen: "Sitizen",
  verifyAccount: "Vɛrify yu akkaunt",
  verificationHelp: "Put di 6-nomba kod we dem sɛn to yu fon ɔ imel.",
  verify: "Vɛrify",
  resendCode: "Sɛn nyu kod",
  dashboard: "Mi dashboard",
  welcome: "Welkom",
  applyId: "Apply fo Nashonal ID",
  myApplications: "Mi aplikeshons",
  appointments: "Appointments",
  notifications: "Notifikeshons",
  wallet: "Digital wallet",
  voiceBridge: "VoiceBridge",
  needHelp: "Yu nid help?",
  voiceHelp: "Yuz VoiceBridge fo hia in yu lengwij",
  invalidInput: "Chɛk di infɔmeshon we yu put.",
  somethingWrong: "Sɛntin rɔng. Try again.",
};

const dictionaries: Partial<Record<Language, Partial<Record<TranslationKey, string>>>> = { krio };

export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language]?.[key] ?? en[key];
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LANGUAGE_META, value);
}
