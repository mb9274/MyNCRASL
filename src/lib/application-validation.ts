import { z } from "zod";
import {
  APPLICATION_LOCATIONS,
  CONTACT_METHOD_OPTIONS,
  SIERRA_LEONE_DISTRICTS,
  type ApplicationLocation,
} from "./application-config";
import { COUNTRIES, isKnownCountry, timeZoneForCountry } from "./countries";
import {
  normalizeInternationalParts,
  normalizeSierraLeonePhone,
} from "./validation";

const districtValues = SIERRA_LEONE_DISTRICTS.map((d) => d.value) as [string, ...string[]];
const countryValues = COUNTRIES.map((country) => country.value) as [string, ...string[]];
const locationValues = APPLICATION_LOCATIONS.map((option) => option.value) as [ApplicationLocation, ...ApplicationLocation[]];
const contactValues = CONTACT_METHOD_OPTIONS.map((option) => option.value) as [string, ...string[]];

const baseSchema = z.object({
  applicationLocation: z.enum(locationValues).default("in_sierra_leone"),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Full name is too long."),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
    }, "Date of birth cannot be in the future."),
  placeOfBirth: z.string().trim().min(2, "Enter your place of birth.").max(160, "Place of birth is too long."),
  countryOfBirth: z.enum(countryValues).default("Sierra Leone"),
  gender: z.enum(["Female", "Male", "Other", "Prefer not to say"], { message: "Select a gender." }),
  nationality: z.enum(["Sierra Leonean", "Other"], { message: "Select your nationality." }),
  nationalityOther: z.string().trim().max(100).default(""),
  existingIdNumber: z.string().trim().max(80).default(""),

  residentialAddress: z.string().trim().max(300).default(""),
  district: z.string().trim().max(80).default(""),
  chiefdom: z.string().trim().max(120).default(""),
  sectionCommunity: z.string().trim().max(120).default(""),

  countryOfResidence: z.string().trim().max(100).default(""),
  overseasAddress: z.string().trim().max(300).default(""),
  overseasCity: z.string().trim().max(120).default(""),
  internationalDialCode: z.string().trim().max(12).default(""),
  internationalNationalNumber: z.string().trim().max(40).default(""),

  phone: z.string().trim().max(40).default(""),
  email: z.union([z.string().trim().email("Enter a valid email address."), z.literal("")]).default(""),
  preferredContactMethod: z.enum(contactValues).default("SMS"),
  consent: z.boolean().refine((value) => value, "Please confirm your information is correct."),
});

export const nationalIdSchema = baseSchema
  .superRefine((data, ctx) => {
    const abroad = data.applicationLocation === "abroad";

    if (data.nationality === "Other" && data.nationalityOther.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["nationalityOther"], message: "Please specify your nationality." });
    }

    if (!abroad) {
      if (data.residentialAddress.trim().length < 5) {
        ctx.addIssue({ code: "custom", path: ["residentialAddress"], message: "Enter your residential address." });
      }
      if (!districtValues.includes(data.district)) {
        ctx.addIssue({ code: "custom", path: ["district"], message: "Select your district." });
      }
      if (data.chiefdom.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["chiefdom"], message: "Enter your chiefdom." });
      }
      if (!normalizeSierraLeonePhone(data.phone)) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Enter a valid Sierra Leone phone number, e.g. 076 123 456.",
        });
      }
      return;
    }

    if (!isKnownCountry(data.countryOfResidence)) {
      ctx.addIssue({ code: "custom", path: ["countryOfResidence"], message: "Select your country of residence." });
    }
    if (data.overseasAddress.trim().length < 5) {
      ctx.addIssue({ code: "custom", path: ["overseasAddress"], message: "Enter your residential address abroad." });
    }
    if (data.overseasCity.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["overseasCity"], message: "Enter your city or town." });
    }
    if (!normalizeInternationalParts(data.internationalDialCode, data.internationalNationalNumber)) {
      ctx.addIssue({
        code: "custom",
        path: ["internationalNationalNumber"],
        message: "Enter a valid international number with country code, e.g. +44 7700 900123.",
      });
    }
    if (!data.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter your email address." });
    }
  })
  .transform((data) => {
    const abroad = data.applicationLocation === "abroad";
    const localPhone = normalizeSierraLeonePhone(data.phone);
    const internationalPhone = normalizeInternationalParts(
      data.internationalDialCode,
      data.internationalNationalNumber,
    );
    return {
      ...data,
      phone: abroad ? internationalPhone ?? "" : localPhone ?? "",
      countryOfResidence: abroad ? data.countryOfResidence : "Sierra Leone",
      timeZone: timeZoneForCountry(abroad ? data.countryOfResidence : "Sierra Leone"),
      residentialAddress: abroad ? "" : data.residentialAddress,
      preferredContactMethod: abroad && data.preferredContactMethod === "SMS" ? "Email" : data.preferredContactMethod,
    };
  });

export type NationalIdInput = z.infer<typeof nationalIdSchema>;

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
