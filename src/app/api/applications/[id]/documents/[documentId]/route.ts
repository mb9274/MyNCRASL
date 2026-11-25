import { requireUser } from "@/lib/auth";
import { getSupportingDocument } from "@/lib/db";
import { fail } from "@/lib/http";
import { decryptPhoto } from "@/lib/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; documentId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id, documentId } = await context.params;
    const document = getSupportingDocument(user.id, id, documentId);
    if (!document) return fail("Document not found.", 404);
    const bytes = decryptPhoto(document.content ?? Buffer.alloc(0));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(error);
    return fail("The document could not be loaded.", 500);
  }
}
