import { z } from "zod";
import { audit, requireRole } from "@/lib/auth";
import { ADMIN_COUNTRY_OPTIONS } from "@/lib/application-config";
import {
  deactivateOverseasArrangement,
  findOverseasArrangement,
  listAllOverseasArrangements,
  saveOverseasArrangement,
} from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

const countryValues = ADMIN_COUNTRY_OPTIONS.map((option) => option.value) as [string, ...string[]];

const arrangementSchema = z.object({
  id: z.string().trim().max(100).optional(),
  country: z.enum(countryValues),
  locationName: z.string().trim().min(2).max(160),
  locationType: z.string().trim().min(2).max(80),
  appointmentAvailability: z.string().trim().min(2).max(500),
  verificationInstructions: z.string().trim().min(2).max(1500),
  collectionInstructions: z.string().trim().min(2).max(1500),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireRole(["admin"]);
    return ok({ arrangements: listAllOverseasArrangements() });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["admin"]);
    const input = arrangementSchema.parse(await request.json());
    const arrangement = saveOverseasArrangement({ ...input, id: null, updatedBy: user.id });
    audit("overseas_arrangement.created", user.id, `country=${arrangement.country}`, "overseas_arrangement", arrangement.id);
    return ok({ arrangement }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(["admin"]);
    const input = arrangementSchema.parse(await request.json());
    if (!input.id) return fail("An arrangement id is required.", 400);
    if (!findOverseasArrangement(input.id)) return fail("Arrangement not found.", 404);
    const arrangement = saveOverseasArrangement({ ...input, updatedBy: user.id });
    audit("overseas_arrangement.updated", user.id, `country=${arrangement.country}`, "overseas_arrangement", arrangement.id);
    return ok({ arrangement });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRole(["admin"]);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return fail("An arrangement id is required.", 400);
    if (!findOverseasArrangement(id)) return fail("Arrangement not found.", 404);
    deactivateOverseasArrangement(id, user.id);
    audit("overseas_arrangement.deactivated", user.id, null, "overseas_arrangement", id);
    return ok({ removed: true });
  } catch (error) {
    return handleError(error);
  }
}
