import { requireRole } from "@/lib/auth";
import { listAllApplications } from "@/lib/db";
import { handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole(["admin"]);
    return ok({ applications: listAllApplications() });
  } catch (error) {
    return handleError(error);
  }
}
