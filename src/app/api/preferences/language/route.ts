import { z } from "zod";
import { getCurrentUser, setAnonymousLanguage } from "@/lib/auth";
import { updateUser } from "@/lib/db";
import { handleError, ok } from "@/lib/http";
import { LANGUAGES } from "@/lib/types";

const schema = z.object({ language: z.enum(LANGUAGES) });

export async function POST(request: Request) {
  try {
    const { language } = schema.parse(await request.json());
    const user = await getCurrentUser();
    if (user) {
      updateUser(user.id, { preferredLanguage: language });
    } else {
      await setAnonymousLanguage(language);
    }
    return ok({ language });
  } catch (error) {
    return handleError(error);
  }
}
