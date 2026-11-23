import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Please check the information you entered.", 422, error.issues);
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") return fail("Please sign in to continue.", 401);
    if (error.message === "FORBIDDEN") return fail("You do not have permission to do that.", 403);
    if (error.message === "CONFLICT") return fail("An account with these details already exists.", 409);
    if (error.message === "NOT_FOUND") return fail("Not found.", 404);
  }
  console.error(error);
  return fail("Something went wrong. Please try again.", 500);
}
