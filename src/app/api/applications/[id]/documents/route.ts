import { requireUser } from "@/lib/auth";
import {
  findApplicationForUser,
  listSupportingDocuments,
  removeSupportingDocument,
  saveSupportingDocument,
} from "@/lib/db";
import { fail, handleError, ok } from "@/lib/http";
import {
  encryptPhoto,
  photoChecksum,
  supportingDocumentStoragePath,
  validateSupportingDocument,
} from "@/lib/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const MAX_DOCUMENTS = 5;

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const application = findApplicationForUser(user.id, id);
    if (!application) return fail("Application not found.", 404);
    return ok({ documents: listSupportingDocuments(user.id, id) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const application = findApplicationForUser(user.id, id);
    if (!application) return fail("Application not found.", 404);
    if (application.status !== "draft") return fail("This application has already been submitted.", 409);
    if (listSupportingDocuments(user.id, id).length >= MAX_DOCUMENTS) {
      return fail(`You can upload up to ${MAX_DOCUMENTS} supporting documents.`, 422);
    }

    const form = await request.formData();
    const file = form.get("document");
    if (!(file instanceof File)) return fail("Choose a supporting document to upload.", 400);

    const bytes = Buffer.from(await file.arrayBuffer());
    const error = validateSupportingDocument({ type: file.type, size: file.size, bytes });
    if (error) return fail(error, 422);

    const document = saveSupportingDocument({
      userId: user.id,
      applicationId: id,
      originalName: file.name.slice(0, 200),
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: supportingDocumentStoragePath(id),
      checksum: photoChecksum(bytes),
      content: encryptPhoto(bytes),
    });
    if (!document) return fail("The document could not be saved.", 500);
    return ok({
      document: {
        id: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        storagePath: document.storagePath,
      },
    }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const documentId = new URL(request.url).searchParams.get("documentId");
    if (!documentId) return fail("Choose a document to remove.", 400);
    const removed = removeSupportingDocument(user.id, id, documentId);
    if (!removed) return fail("Document not found.", 404);
    return ok({ removed: true });
  } catch (error) {
    return handleError(error);
  }
}
