import { z } from "zod";
import { audit, hashVerificationCode, requireUser } from "@/lib/auth";
import { findVerificationCode, markVerificationCodeUsed, updateUser } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { code } = schema.parse(await request.json());
    const record = findVerificationCode(user.id, "account", hashVerificationCode(code));
    if (!record) return fail("That code is incorrect or has expired.", 400);
    if (record.expires_at < new Date().toISOString()) return fail("That code has expired. Request a new one.", 400);

    markVerificationCodeUsed(record.id);
    updateUser(user.id, { isVerified: true, emailVerified: Boolean(user.email) });
    audit("user.verified", user.id, user.email ? "emailVerified=true (prototype code)" : "phone verified");
    return ok({ verified: true });
  } catch (error) {
    return handleError(error);
  }
}
