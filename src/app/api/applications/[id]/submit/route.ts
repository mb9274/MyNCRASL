import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fieldErrorsFrom, nationalIdSchema } from "@/lib/application-validation";
import { findApplicationForUser, getApplicationPhoto, listSupportingDocuments, submitApplication } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

const schema = z.object({ formData: z.record(z.string(), z.unknown()) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const application = findApplicationForUser(user.id, id);
    if (!application) return fail("Application not found.", 404);

    // Idempotency: a repeated click never creates another submission.
    if (application.status !== "draft") {
      return ok({ application, alreadySubmitted: true });
    }

    const parsed = nationalIdSchema.safeParse(input.formData);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrorsFrom(parsed.error));
    }

    const photo = getApplicationPhoto(user.id, id);
    if (!photo) return fail("Upload a passport photograph before submitting.", 422, { photo: "A passport photograph is required." });

    if (parsed.data.applicationLocation === "abroad" && listSupportingDocuments(user.id, id).length === 0) {
      return fail("Upload at least one supporting document before submitting from abroad.", 422, {
        supportingDocuments: "At least one supporting document is required for an overseas application.",
      });
    }

    const submitted = submitApplication(user.id, id, { ...input.formData, ...parsed.data });
    if (!submitted) return fail("The application could not be submitted. Please try again.", 500);

    return ok({ application: submitted, alreadySubmitted: false }, 201);
  } catch (error) {
    return handleError(error);
  }
}
