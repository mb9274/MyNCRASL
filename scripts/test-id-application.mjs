/**
 * End-to-end check for the MyNCRA prototype ID application.
 * Run `npm run dev` first, then `npm run test:id-app`.
 * Uses only fictional data and a generated sample PNG. No real identity data.
 */
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";

const BASE_URL = process.env.MYNCRA_TEST_URL || "http://localhost:3000";
const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlFDR8AAAAASUVORK5CYII=",
  "base64",
);

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function api(route, { method = "GET", cookie, body, form, expectStatus } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    redirect: "manual",
  });
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // HTML pages and image responses are intentionally not JSON.
  }
  if (expectStatus !== undefined) {
    assert(response.status === expectStatus, `${method} ${route} returns ${expectStatus} (got ${response.status})`);
  }
  return { response, data, text };
}

function sessionCookie(response) {
  const header = response.headers.get("set-cookie");
  assert(Boolean(header?.includes("myncra_session=")), "registration sets a session cookie");
  return header.split(";")[0];
}

function photoForm(bytes = SAMPLE_PNG, type = "image/png", filename = "sample-passport.png") {
  const form = new FormData();
  form.append("photo", new Blob([bytes], { type }), filename);
  return form;
}

async function createVerifiedUser(fullName, phone, email) {
  const registration = await api("/api/auth/register", {
    method: "POST",
    body: {
      fullName,
      phone,
      email,
      password: "TestPass123!",
      confirmPassword: "TestPass123!",
      preferredLanguage: "en",
      role: "citizen",
    },
    expectStatus: 201,
  });
  const cookie = sessionCookie(registration.response);
  const code = registration.data?.data?.demoVerificationCode;
  assert(Boolean(code), `demo verification code issued for ${fullName}`);
  await api("/api/auth/verify", { method: "POST", cookie, body: { code }, expectStatus: 200 });
  return { cookie, userId: registration.data.data.user.id };
}

async function main() {
  console.log(`MyNCRA ID application test against ${BASE_URL}`);
  const random = crypto.randomInt(100000, 999999);
  const suffixA = random;
  const suffixB = random === 999999 ? 100000 : random + 1;
  const userA = await createVerifiedUser("Aminata Fictional Test", `076${suffixA}`, `idtest${suffixA}@example.test`);
  const userB = await createVerifiedUser("Musa Fictional Test", `076${suffixB}`, `idtest${suffixB}@example.test`);

  const validForm = {
    fullName: "Aminata Fictional Test",
    dateOfBirth: "1995-08-15",
    placeOfBirth: "Fictional Town, Boom District",
    gender: "Female",
    nationality: "Sierra Leonean",
    nationalityOther: "",
    existingIdNumber: "",
    residentialAddress: "12 Fictional Lane, Sample Community",
    district: "Boom",
    chiefdom: "Fictional Chiefdom",
    sectionCommunity: "Sample Section",
    phone: "076123456",
    email: `idtest${suffixA}@example.test`,
    preferredContactMethod: "SMS",
    consent: true,
  };

  console.log("Draft and validation");
  const draftResult = await api("/api/applications/draft", {
    method: "POST",
    cookie: userA.cookie,
    body: { formData: validForm },
    expectStatus: 200,
  });
  const applicationId = draftResult.data.data.application.id;
  const reference = draftResult.data.data.application.reference;
  assert(draftResult.data.data.application.status === "draft", "draft application created with unique reference");

  const noPhoto = await api(`/api/applications/${applicationId}/submit`, {
    method: "POST",
    cookie: userA.cookie,
    body: { formData: validForm },
    expectStatus: 422,
  });
  assert(noPhoto.data.error.message.includes("photograph"), "submission without a photograph is rejected");

  const invalidPhone = await api(`/api/applications/${applicationId}/submit`, {
    method: "POST",
    cookie: userA.cookie,
    body: { formData: { ...validForm, phone: "12345" } },
    expectStatus: 422,
  });
  assert(Boolean(invalidPhone.data.error.details?.phone), "invalid phone number is reported on the phone field");

  const correctedName = "Aminata Corrected Test";
  await api("/api/applications/draft", {
    method: "POST",
    cookie: userA.cookie,
    body: { applicationId, formData: { ...validForm, fullName: correctedName } },
    expectStatus: 200,
  });
  validForm.fullName = correctedName;

  console.log("Photograph upload, removal and replacement");
  const badType = await api(`/api/applications/${applicationId}/photo`, {
    method: "POST",
    cookie: userA.cookie,
    form: photoForm(Buffer.from("not an image"), "text/plain", "not-a-photo.txt"),
    expectStatus: 422,
  });
  assert(badType.data.error.message.includes("JPEG, JPG or PNG"), "unsupported file type is rejected");

  const tooLarge = await api(`/api/applications/${applicationId}/photo`, {
    method: "POST",
    cookie: userA.cookie,
    form: photoForm(Buffer.alloc(5 * 1024 * 1024 + 1, 0), "image/png", "too-large.png"),
    expectStatus: 422,
  });
  assert(tooLarge.data.error.message.includes("5 MB"), "oversized photograph is rejected");

  const uploaded = await api(`/api/applications/${applicationId}/photo`, {
    method: "POST",
    cookie: userA.cookie,
    form: photoForm(),
    expectStatus: 200,
  });
  const firstStoragePath = uploaded.data.data.photo.storagePath;
  assert(firstStoragePath.startsWith(`db://photos/${applicationId}/`), "logical storage path is saved, not a temporary file path");

  const photoResponse = await fetch(`${BASE_URL}/api/applications/${applicationId}/photo`, {
    headers: { cookie: userA.cookie },
    redirect: "manual",
  });
  assert(photoResponse.status === 200, "authenticated owner can preview the photograph");
  const downloaded = Buffer.from(await photoResponse.arrayBuffer());
  assert(downloaded.equals(SAMPLE_PNG), "stored photograph bytes round-trip correctly");
  assert(photoResponse.headers.get("cache-control")?.includes("no-store"), "photograph preview is not cached publicly");

  await api(`/api/applications/${applicationId}/photo`, {
    method: "DELETE",
    cookie: userA.cookie,
    expectStatus: 200,
  });
  const afterDelete = await api(`/api/applications/${applicationId}/photo`, { cookie: userA.cookie, expectStatus: 404 });
  assert(afterDelete.data.error.message.includes("not found"), "photograph can be removed");

  const replaced = await api(`/api/applications/${applicationId}/photo`, {
    method: "POST",
    cookie: userA.cookie,
    form: photoForm(),
    expectStatus: 200,
  });
  assert(replaced.data.data.photo.storagePath !== firstStoragePath, "photograph can be replaced with a new storage reference");

  console.log("Submission and idempotency");
  const missingConsent = await api(`/api/applications/${applicationId}/submit`, {
    method: "POST",
    cookie: userA.cookie,
    body: { formData: { ...validForm, consent: false } },
    expectStatus: 422,
  });
  assert(Boolean(missingConsent.data.error.details?.consent), "confirmation checkbox is required before submission");

  const submitted = await api(`/api/applications/${applicationId}/submit`, {
    method: "POST",
    cookie: userA.cookie,
    body: { formData: validForm },
    expectStatus: 201,
  });
  assert(submitted.data.data.application.status === "submitted", "application status becomes Submitted");
  assert(submitted.data.data.application.reference === reference, "reference number is retained on submission");
  assert(Boolean(submitted.data.data.application.submittedAt), "submission date is recorded");

  const duplicate = await api(`/api/applications/${applicationId}/submit`, {
    method: "POST",
    cookie: userA.cookie,
    body: { formData: validForm },
    expectStatus: 200,
  });
  assert(duplicate.data.data.alreadySubmitted === true, "repeat submission is idempotent and creates no second record");

  console.log("Dashboard, tracking and access control");
  const detailPage = await api(`/applications/${applicationId}`, { cookie: userA.cookie, expectStatus: 200 });
  assert(detailPage.text.includes(reference), "detail page shows the reference number");
  assert(detailPage.text.includes(correctedName), "detail page shows the corrected applicant name");
  assert(detailPage.text.includes("not been sent to NCRA"), "detail page clearly labels the prototype submission");

  const listPage = await api("/applications", { cookie: userA.cookie, expectStatus: 200 });
  assert(listPage.text.includes(reference), "applications list shows the submitted application");

  const dashboard = await api("/dashboard", { cookie: userA.cookie, expectStatus: 200 });
  assert(dashboard.text.includes(reference), "dashboard shows the submitted application");

  await api(`/api/applications/${applicationId}`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot read the application through the API");
  await api(`/api/applications/${applicationId}/photo`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot view the photograph");
  await api(`/api/applications/${applicationId}/submit`, {
    method: "POST",
    cookie: userB.cookie,
    body: { formData: validForm },
    expectStatus: 404,
  });
  assert(true, "another citizen cannot submit the application");
  await api("/api/applications/draft", {
    method: "POST",
    cookie: userB.cookie,
    body: { applicationId, formData: validForm },
    expectStatus: 404,
  });
  assert(true, "another citizen cannot update the draft");
  await api(`/applications/${applicationId}`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot open the detail page");

  console.log("Database verification");
  const dbPath = process.env.MYNCRA_DB_PATH || path.join(process.cwd(), "data", "myncra.db");
  const db = new DatabaseSync(dbPath);
  try {
    const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId);
    assert(row.user_id === userA.userId, "application belongs to the correct authenticated citizen");
    assert(row.status === "submitted" && row.submitted_at, "database record is Submitted with a submission date");
    assert(String(row.photo_storage_path).startsWith("db://photos/"), "database stores the photograph reference");
    assert(Boolean(row.photo_document_id), "database links the active photograph document");

    const savedForm = JSON.parse(row.form_data);
    assert(savedForm.fullName === correctedName, "corrected form information is stored");
    assert(savedForm.phone === "+23276123456", "phone number is normalised and stored");

    const document = db.prepare("SELECT * FROM documents WHERE id = ?").get(row.photo_document_id);
    assert(document.user_id === userA.userId && document.is_active === 1, "photograph document is scoped and active");
    assert(!Buffer.from(document.content).equals(SAMPLE_PNG), "photograph bytes are encrypted at rest");
    assert(document.checksum === crypto.createHash("sha256").update(SAMPLE_PNG).digest("hex"), "photograph checksum matches the sample");

    const submittedEvents = db
      .prepare("SELECT * FROM application_events WHERE application_id = ? AND to_status = 'submitted'")
      .all(applicationId);
    assert(submittedEvents.length === 1, "only one Submitted status event exists");

    const notifications = db
      .prepare("SELECT * FROM notifications WHERE application_id = ? AND title = ?")
      .all(applicationId, "Test application submitted");
    assert(notifications.length === 1, "one prototype submission notification was created");

    const crossUserRow = db.prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?").get(applicationId, userB.userId);
    assert(crossUserRow === undefined, "no cross-user database record is visible");
  } finally {
    db.close();
  }

  console.log(`\nAll ID application checks passed for ${reference}.`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
