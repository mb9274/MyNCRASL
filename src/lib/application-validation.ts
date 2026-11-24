import { z } from "zod";
import { SIERRA_LEONE_DISTRICTS } from "./application-config";
import { normalizeSierraLeonePhone } from "./validation";

const districtValues = SIERRA_LEONE_DISTRICTS.map((d) => d.value) as [string, ...string[]];

export const nationalIdSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Full name is too long."),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
      }, "Date of birth cannot be in the future."),
    placeOfBirth: z.string().trim().min(2, "Enter your place of birth.").max(160, "Place of birth is too long."),
    gender: z.enum(["Female", "Male", "Other", "Prefer not to say"], { message: "Select a gender." }),
    nationality: z.enum(["Sierra Leonean", "Other"], { message: "Select your nationality." }),
    nationalityOther: z.string().trim().max(100).default(""),
    existingIdNumber: z.string().trim().max(80).default(""),
    residentialAddress: z.string().trim().min(5, "Enter your residential address.").max(300, "Address is too long."),
    district: z.enum(districtValues, { message: "Select your district." }),
    chiefdom: z.string().trim().min(2, "Enter your chiefdom.").max(120, "Chiefdom is too long."),
    sectionCommunity: z.string().trim().max(120).default(""),
    phone: z
      .string()
      .trim()
      .refine((value) => normalizeSierraLeonePhone(value) !== null, "Enter a valid Sierra Leone phone number, e.g. 076 123 456.")
      .transform((value) => normalizeSierraLeonePhone(value)!),
    email: z.union([z.string().trim().email("Enter a valid email address."), z.literal("")]).default(""),
    preferredContactMethod: z.enum(["Phone call", "SMS", "Email"]).default("SMS"),
    consent: z.boolean().refine((value) => value, "Please confirm your information is correct."),
  })
  .superRefine((data, ctx) => {
    if (data.nationality === "Other" && data.nationalityOther.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["nationalityOther"], message: "Please specify your nationality." });
    }
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
