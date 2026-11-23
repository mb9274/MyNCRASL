import { z } from "zod";
import { audit, createUserSession, verifyPassword } from "@/lib/auth";
import { findUserByEmail, findUserByPhone } from "@/lib/db";
import { handleError, ok, fail } from "@/lib/http";
import { normalizeSierraLeonePhone } from "@/lib/validation";

const schema = z.object({
  identifier: z.string().trim().min(3).max(180),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const phone = normalizeSierraLeonePhone(input.identifier);
    const user = (phone ? findUserByPhone(phone) : null) ?? findUserByEmail(input.identifier.toLowerCase());
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return fail("Incorrect phone number, email or password.", 401);
    }
    await createUserSession(user.id);
    audit("user.logged_in", user.id);
    return ok({
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        preferredLanguage: user.preferredLanguage,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
