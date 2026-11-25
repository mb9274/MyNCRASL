import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { APPLICATION_STATUSES } from "@/lib/types";
import { findApplicationById, setApplicationStatusAsAdmin } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

const statusValues = APPLICATION_STATUSES as unknown as [string, ...string[]];

const schema = z.object({
  status: z.enum(statusValues),
  note: z.string().trim().min(2, "Enter a short note for the applicant.").max(1000),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["admin"]);
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    if (!findApplicationById(id)) return fail("Application not found.", 404);
    const application = setApplicationStatusAsAdmin(id, {
      status: input.status as (typeof APPLICATION_STATUSES)[number],
      note: input.note,
      actorId: user.id,
    });
    return ok({ application });
  } catch (error) {
    return handleError(error);
  }
}
