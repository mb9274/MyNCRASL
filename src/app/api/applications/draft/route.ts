import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createDraftApplication, findDraftApplication, updateDraftForm } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

const schema = z.object({
  applicationId: z.string().optional(),
  formData: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());

    if (input.applicationId) {
      const updated = updateDraftForm(user.id, input.applicationId, input.formData);
      if (!updated) return fail("Draft not found or it has already been submitted.", 404);
      return ok({ application: updated });
    }

    const existing = findDraftApplication(user.id);
    const application = existing
      ? updateDraftForm(user.id, existing.id, input.formData)!
      : createDraftApplication(user.id, input.formData);
    return ok({ application });
  } catch (error) {
    return handleError(error);
  }
}
