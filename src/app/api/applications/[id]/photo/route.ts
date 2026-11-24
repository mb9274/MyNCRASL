import { requireUser } from "@/lib/auth";
import { findApplicationForUser, getApplicationPhoto, removeApplicationPhoto, saveApplicationPhoto } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";
import {
  decryptPhoto,
  encryptPhoto,
  photoChecksum,
  photoStoragePath,
  validatePhoto,
} from "@/lib/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const document = getApplicationPhoto(user.id, id);
    if (!document) return fail("Photograph not found.", 404);
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
    return fail("The photograph could not be loaded.", 500);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const application = findApplicationForUser(user.id, id);
    if (!application) return fail("Application not found.", 404);
    if (application.status !== "draft") return fail("This application has already been submitted.", 409);

    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) return fail("Choose a photograph to upload.", 400);

    const bytes = Buffer.from(await file.arrayBuffer());
    const error = validatePhoto({ type: file.type, size: file.size, bytes });
    if (error) return fail(error, 422);

    const document = saveApplicationPhoto({
      userId: user.id,
      applicationId: id,
      originalName: file.name.slice(0, 200),
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: photoStoragePath(id),
      checksum: photoChecksum(bytes),
      content: encryptPhoto(bytes),
    });
    if (!document) return fail("The photograph could not be saved.", 500);
    return ok({
      photo: {
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        storagePath: document.storagePath,
        previewUrl: `/api/applications/${id}/photo`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const removed = removeApplicationPhoto(user.id, id);
    if (!removed) return fail("No photograph to remove.", 404);
    return ok({ removed: true });
  } catch (error) {
    return handleError(error);
  }
}
