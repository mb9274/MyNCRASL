import { z } from "zod";
import { audit, createUserSession, generateCode, hashPassword, hashVerificationCode } from "@/lib/auth";
import { createUser, findUserByEmail, findUserByPhone, saveVerificationCode } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";
import { LANGUAGES } from "@/lib/types";
import { normalizeSierraLeonePhone } from "@/lib/validation";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(20),
  email: z.union([z.string().trim().email().max(180), z.literal("")]).optional(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  preferredLanguage: z.enum(LANGUAGES),
  role: z.enum(["citizen", "assistant"]).default("citizen"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = schema.parse(body);
    const phone = normalizeSierraLeonePhone(input.phone);
    if (!phone) return fail("Enter a valid Sierra Leone phone number, e.g. 076123456 or +23276123456.", 422);

    if (findUserByPhone(phone)) throw new Error("CONFLICT");
    const email = input.email || null;
    if (email && findUserByEmail(email)) throw new Error("CONFLICT");

    const user = createUser({
      phone,
      email,
      fullName: input.fullName,
      passwordHash: hashPassword(input.password),
      preferredLanguage: input.preferredLanguage,
      role: input.role,
    });

    const code = generateCode();
    saveVerificationCode(user.id, "account", hashVerificationCode(code), new Date(Date.now() + 30 * 60 * 1000).toISOString());
    await createUserSession(user.id);
    audit("user.registered", user.id, `role=${user.role}`);

    return ok(
      {
        user: { id: user.id, fullName: user.fullName, phone: user.phone, isVerified: false },
        // Demo build only: with no SMS gateway configured, the code is returned so the
        // verification step can be tested end to end. Never do this in production.
        demoVerificationCode: process.env.MYNCRA_HIDE_DEMO_CODES === "true" ? undefined : code,
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
