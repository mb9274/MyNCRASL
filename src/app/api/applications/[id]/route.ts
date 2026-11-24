import { requireUser } from "@/lib/auth";
import { findApplicationForUser, listApplicationEvents } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const application = findApplicationForUser(user.id, id);
    if (!application) return fail("Application not found.", 404);
    return ok({ application, events: listApplicationEvents(user.id, id) });
  } catch (error) {
    return handleError(error);
  }
}
