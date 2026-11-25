import { z } from "zod";
import { audit, createUserSession, generateCode, hashPassword, hashVerificationCode } from "@/lib/auth";
import { isKnownCountry } from "@/lib/countries";
import { createUser, findUserByEmail, findUserByPhone, saveVerificationCode } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";
import { LANGUAGES } from "@/lib/types";
import { normalizeInternationalPhone, normalizeSierraLeonePhone } from "@/lib/validation";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  countryOfResidence: z.string().trim().max(100).optional(),
  email: z.union([z.string().trim().email().max(180), z.literal("")]).optional(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  preferredLanguage: z.enum(LANGUAGES),
  role: z.enum(["citizen", "assistant"]).default("citizen"),
  registrationRoute: z.enum(["in_sierra_leone", "abroad"]).default("in_sierra_leone"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = schema.parse(body);
    const abroad = input.registrationRoute === "abroad";

    let phone: string | null;
    if (abroad) {
      if (!input.countryOfResidence || !isKnownCountry(input.countryOfResidence)) {
        return fail("Select a valid country of residence.", 422);
      }
      if (!input.email) return fail("An email address is required for registration from abroad.", 422);
      phone = normalizeInternationalPhone(input.phone);
      if (!phone) return fail("Enter a valid international phone number with country code, e.g. +44 7700 900123.", 422);
    } else {
      phone = normalizeSierraLeonePhone(input.phone);
      if (!phone) return fail("Enter a valid Sierra Leone phone number (8 digits after +232), e.g. 076 123 456 or +232 76 123 456.", 422);
    }

    if (findUserByPhone(phone)) throw new Error("CONFLICT");
    const email = input.email || null;
    if (email && findUserByEmail(email)) throw new Error("CONFLICT");

    const user = createUser({
      phone,
      email,
      countryOfResidence: abroad ? input.countryOfResidence : "Sierra Leone",
      fullName: input.fullName,
      passwordHash: hashPassword(input.password),
      preferredLanguage: input.preferredLanguage,
      role: input.role,
    });

    const code = generateCode();
    saveVerificationCode(user.id, "account", hashVerificationCode(code), new Date(Date.now() + 30 * 60 * 1000).toISOString());
    await createUserSession(user.id);
    audit("user.registered", user.id, `role=${user.role}; route=${input.registrationRoute}; country=${user.countryOfResidence ?? "unknown"}`);

    return ok(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          countryOfResidence: user.countryOfResidence,
          isVerified: false,
        },
        // Demo build only: with no SMS/email gateway configured, the code is returned so the
        // verification step can be tested end to end. Never do this in production.
        demoVerificationCode: process.env.MYNCRA_HIDE_DEMO_CODES === "true" ? undefined : code,
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}