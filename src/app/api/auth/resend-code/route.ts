import { audit, generateCode, hashVerificationCode, requireUser } from "@/lib/auth";
import { saveVerificationCode } from "@/lib/db";
import { handleError, ok } from "@/lib/http";

export async function POST() {
  try {
    const user = await requireUser();
    const code = generateCode();
    saveVerificationCode(user.id, "account", hashVerificationCode(code), new Date(Date.now() + 30 * 60 * 1000).toISOString());
    audit("verification_code.resent", user.id);
    return ok({
      message: "A new code has been sent.",
      demoVerificationCode: process.env.MYNCRA_HIDE_DEMO_CODES === "true" ? undefined : code,
    });
  } catch (error) {
    return handleError(error);
  }
}
