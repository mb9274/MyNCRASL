import { listOverseasArrangements } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const country = new URL(request.url).searchParams.get("country")?.trim();
    if (country && country.length > 100) return fail("Country filter is too long.", 400);
    return ok({ arrangements: listOverseasArrangements(country || undefined) });
  } catch (error) {
    return handleError(error);
  }
}
