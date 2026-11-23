import { NextResponse } from "next/server";
import { audit, destroyUserSession, getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) audit("user.logged_out", user.id);
  await destroyUserSession();
  return NextResponse.redirect(new URL("/?signedOut=1", request.url), 303);
}
