/**
 * End-to-end check for the MyNCRA prototype ID application.
 * Run `npm run dev` first, then `npm run test:id-app`.
 * Uses only fictional data and generated sample files. No real identity data.
 */
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";

const BASE_URL = process.env.MYNCRA_TEST_URL || "http://localhost:3000";
const DB_PATH = process.env.MYNCRA_DB_PATH || path.join(process.cwd(), "data", "myncra.db");
const PASSWORD = "TestPass123!";
const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlFDR8AAAAASUVORK5CYII=",
  "base64",
);
const SAMPLE_PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n", "utf8");

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
    // HTML pages and file responses are intentionally not JSON.
  }
  if (expectStatus !== undefined) {
    assert(response.status === expectStatus, `${method} ${route} returns ${expectStatus} (got ${response.status})`);
  }
  return { response, data, text };
}

function sessionCookie(response) {
  const header = response.headers.get("set-cookie");
  assert(Boolean(header?.includes("myncra_session=")), "registration/login sets a session cookie");
  return header.split(";")[0];
}

function photoForm(bytes = SAMPLE_PNG, type = "image/png", filename = "sample-passport.png") {
  const form = new FormData();
  form.append("photo", new Blob([bytes], { type }), filename);
  return form;
}

function documentForm(bytes = SAMPLE_PDF, type = "application/pdf", filename = "sample-support.pdf") {
  const form = new FormData();
  form.append("document", new Blob([bytes], { type }), filename);
  return form;
}

async function createVerifiedUser(fullName, phone, email, extra = {}) {
  const registration = await api("/api/auth/register", {
    method: "POST",
    body: {
      fullName,
      phone,
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      preferredLanguage: "en",
      role: "citizen",
      ...extra,
    },
    expectStatus: 201,
  });
  const cookie = sessionCookie(registration.response);
  const code = registration.data?.data?.demoVerificationCode;
  assert(Boolean(code), `demo verification code issued for ${fullName}`);
  await api("/api/auth/verify", { method: "POST", cookie, body: { code }, expectStatus: 200 });
  return { cookie, userId: registration.data.data.user.id };
}

function nextSuffix(value) {
  return value === 999999 ? 100000 : value + 1;
}

async function main() {
  console.log(`MyNCRA ID application test against ${BASE_URL}`);
  const random = crypto.randomInt(100000, 999999);
  const suffixA = random;
  const suffixB = nextSuffix(suffixA);
  const suffixC = nextSuffix(suffixB);
  const suffixD = nextSuffix(suffixC);

  console.log("Accounts and international phone support");
  const userA = await createVerifiedUser("Aminata Fictional Test", `076${suffixA}`, `idtest${suffixA}@example.test`);
  const userB = await createVerifiedUser("Musa Fictional Test", `076${suffixB}`, `idtest${suffixB}@example.test`);
  const ukUser = await createVerifiedUser(
    "Fatima Fictional Diaspora",
    "+447700900123",
    `diasporauk${suffixA}@example.test`,
    { countryOfResidence: "United Kingdom", registrationRoute: "abroad" },
  );
  const usUser = await createVerifiedUser(
    "Kofi Fictional Diaspora",
    "+12025550123",
    `diasporaus${suffixB}@example.test`,
    { countryOfResidence: "United States", registrationRoute: "abroad" },
  );

  const ukLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "+44 7700 900123", password: PASSWORD },
    expectStatus: 200,
  });
  assert(ukLogin.data.data.user.phone === "+447700900123", "a UK account signs in with an international number");
  const usLogin = await api("/api/auth/login", {
    method: "POST",
    body: { identifier: "001 202 555 0123", password: PASSWORD },
    expectStatus: 200,
  });
  assert(usLogin.data.data.user.phone === "+12025550123", "a US account signs in using the 00 international prefix");

  const invalidAbroad = await api("/api/auth/register", {
    method: "POST",
    body: {
      fullName: "Invalid Fictional Test",
      phone: "+441234",
      email: `invalid${suffixA}@example.test`,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      preferredLanguage: "en",
      countryOfResidence: "United Kingdom",
      registrationRoute: "abroad",
    },
    expectStatus: 422,
  });
  assert(invalidAbroad.data.error.message.includes("international phone"), "short international numbers are rejected");

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

  console.log("Local draft and validation");
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
  assert(badType.data.error.message.includes("JPEG, JPG or PNG"), "unsupported photo type is rejected");

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
  assert(firstStoragePath.startsWith(`db://photos/${applicationId}/`), "logical photo storage path is saved");

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
  assert(replaced.data.data.photo.storagePath !== firstStoragePath, "photograph can be replaced");

  console.log("Local submission and idempotency");
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
  assert(duplicate.data.data.alreadySubmitted === true, "repeat submission is idempotent");

  console.log("Homepage and local tracking");
  const homepage = await api("/", { expectStatus: 200 });
  assert(homepage.text.includes("Apply for Your National ID"), "homepage offers the Sierra Leone entry route");
  assert(homepage.text.includes("Living Abroad"), "homepage offers the overseas entry route");
  assert(homepage.text.includes("Design pending"), "card showcase remains a neutral design-pending shell");

  const detailPage = await api(`/applications/${applicationId}`, { cookie: userA.cookie, expectStatus: 200 });
  assert(detailPage.text.includes(reference), "detail page shows the reference number");
  assert(detailPage.text.includes(correctedName), "detail page shows the corrected applicant name");
  assert(detailPage.text.includes("not been sent to NCRA"), "detail page clearly labels the prototype submission");

  const listPage = await api("/applications", { cookie: userA.cookie, expectStatus: 200 });
  assert(listPage.text.includes(reference), "applications list shows the submitted application");
  const dashboard = await api("/dashboard", { cookie: userA.cookie, expectStatus: 200 });
  assert(dashboard.text.includes(reference), "dashboard shows the submitted application");
  assert(dashboard.text.includes("queued, not delivered"), "dashboard labels outbox messages as not delivered");

  const printPage = await api(`/applications/${applicationId}/print`, { cookie: userA.cookie, expectStatus: 200 });
  assert(printPage.text.includes("NOT AN OFFICIAL ID"), "printed confirmation carries a clear official-ID warning");
  assert(printPage.text.includes(reference), "printed confirmation shows the application reference");
  assert(printPage.text.includes("Print this confirmation"), "printed confirmation includes a print action");

  await api(`/api/applications/${applicationId}`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot read the application through the API");
  await api(`/api/applications/${applicationId}/photo`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot view the photograph");
  await api(`/applications/${applicationId}/print`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot open the printed confirmation");
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

  console.log("Diaspora application from the United Kingdom");
  const abroadApply = await api("/apply?from=abroad", { cookie: ukUser.cookie, expectStatus: 200 });
  assert(abroadApply.text.includes("Apply from abroad"), "diaspora entry opens the overseas application route");
  const diasporaGuide = await api("/diaspora", { cookie: ukUser.cookie, expectStatus: 200 });
  assert(diasporaGuide.text.includes("No embassy, consulate"), "diaspora guide makes no overseas arrangement claim");

  const ukForm = {
    applicationLocation: "abroad",
    fullName: "Fatima Fictional Diaspora",
    dateOfBirth: "1992-03-20",
    placeOfBirth: "Fictional Town, Sierra Leone",
    countryOfBirth: "Sierra Leone",
    gender: "Female",
    nationality: "Sierra Leonean",
    nationalityOther: "",
    existingIdNumber: "",
    countryOfResidence: "United Kingdom",
    overseasAddress: "14 Fictional Street, Fictional Area",
    overseasCity: "London",
    internationalDialCode: "+44",
    internationalNationalNumber: "7700900123",
    phone: "+447700900123",
    email: `diasporauk${suffixA}@example.test`,
    preferredContactMethod: "WhatsApp",
    consent: true,
  };
  const ukDraft = await api("/api/applications/draft", {
    method: "POST",
    cookie: ukUser.cookie,
    body: { formData: ukForm },
    expectStatus: 200,
  });
  const ukApplicationId = ukDraft.data.data.application.id;
  const ukReference = ukDraft.data.data.application.reference;

  await api(`/api/applications/${ukApplicationId}/photo`, {
    method: "POST",
    cookie: ukUser.cookie,
    form: photoForm(),
    expectStatus: 200,
  });
  const noDocument = await api(`/api/applications/${ukApplicationId}/submit`, {
    method: "POST",
    cookie: ukUser.cookie,
    body: { formData: ukForm },
    expectStatus: 422,
  });
  assert(noDocument.data.error.message.includes("supporting document"), "overseas submission requires a supporting document");

  const badDocument = await api(`/api/applications/${ukApplicationId}/documents`, {
    method: "POST",
    cookie: ukUser.cookie,
    form: documentForm(Buffer.from("plain text"), "text/plain", "notes.txt"),
    expectStatus: 422,
  });
  assert(badDocument.data.error.message.includes("PDF, JPEG"), "unsupported supporting-document type is rejected");

  const documentUpload = await api(`/api/applications/${ukApplicationId}/documents`, {
    method: "POST",
    cookie: ukUser.cookie,
    form: documentForm(),
    expectStatus: 201,
  });
  const documentId = documentUpload.data.data.document.id;
  assert(documentUpload.data.data.document.storagePath.startsWith(`db://documents/${ukApplicationId}/`), "supporting document uses a logical storage path");

  const documentResponse = await fetch(`${BASE_URL}/api/applications/${ukApplicationId}/documents/${documentId}`, {
    headers: { cookie: ukUser.cookie },
    redirect: "manual",
  });
  assert(documentResponse.status === 200, "owner can download the supporting document");
  assert(Buffer.from(await documentResponse.arrayBuffer()).equals(SAMPLE_PDF), "supporting document bytes round-trip correctly");
  await api(`/api/applications/${ukApplicationId}/documents/${documentId}`, { cookie: userB.cookie, expectStatus: 404 });
  assert(true, "another citizen cannot download the supporting document");

  const ukSubmitted = await api(`/api/applications/${ukApplicationId}/submit`, {
    method: "POST",
    cookie: ukUser.cookie,
    body: { formData: ukForm },
    expectStatus: 201,
  });
  assert(ukSubmitted.data.data.application.status === "submitted", "overseas application status becomes Submitted");

  const ukDetail = await api(`/applications/${ukApplicationId}`, { cookie: ukUser.cookie, expectStatus: 200 });
  assert(ukDetail.text.includes("United Kingdom"), "overseas detail page shows country of residence");
  assert(ukDetail.text.includes("No authorised overseas arrangement has been configured"), "overseas detail page gives safe next steps");
  const ukPrint = await api(`/applications/${ukApplicationId}/print`, { cookie: ukUser.cookie, expectStatus: 200 });
  assert(ukPrint.text.includes("NOT AN OFFICIAL ID"), "overseas printed confirmation is clearly not an official ID");
  assert(ukPrint.text.includes(ukReference), "overseas printed confirmation shows the reference");
  const ukDashboard = await api("/dashboard", { cookie: ukUser.cookie, expectStatus: 200 });
  assert(ukDashboard.text.includes("Diaspora account"), "diaspora dashboard section is visible");
  assert(ukDashboard.text.includes("Europe/London") || ukDashboard.text.includes("United Kingdom"), "diaspora dashboard shows location context");

  console.log("Prototype outbox and admin controls");
  await api("/api/admin/applications", { cookie: userA.cookie, expectStatus: 403 });
  assert(true, "citizen cannot list all applications through the admin API");
  await api("/api/admin/overseas-arrangements", { cookie: userA.cookie, expectStatus: 403 });
  assert(true, "citizen cannot access overseas arrangement admin API");

  const adminUser = await createVerifiedUser("Admin Fictional Test", `076${suffixC}`, `admintest${suffixC}@example.test`);
  const promotionDb = new DatabaseSync(DB_PATH);
  try {
    promotionDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminUser.userId);
  } finally {
    promotionDb.close();
  }
  await api("/api/admin/applications", { cookie: adminUser.cookie, expectStatus: 200 });
  assert(true, "administrator can list prototype applications");
  await api("/api/admin/overseas-arrangements", { cookie: adminUser.cookie, expectStatus: 200 });
  assert(true, "administrator can access overseas arrangements");

  const locationName = `Prototype Test Contact Point ${random}`;
  const createdArrangement = await api("/api/admin/overseas-arrangements", {
    method: "POST",
    cookie: adminUser.cookie,
    body: {
      country: "United Kingdom",
      locationName,
      locationType: "Prototype test contact point",
      appointmentAvailability: "No appointments are offered by this prototype.",
      verificationInstructions: "Use official NCRA channels only.",
      collectionInstructions: "No card collection is arranged by this prototype.",
      isActive: true,
    },
    expectStatus: 201,
  });
  const arrangementId = createdArrangement.data.data.arrangement.id;
  const publicArrangements = await api("/api/overseas-arrangements?country=United%20Kingdom", { expectStatus: 200 });
  assert(
    publicArrangements.data.data.arrangements.some((arrangement) => arrangement.locationName === locationName),
    "configured arrangement appears in the public citizen view",
  );
  await api(`/api/admin/overseas-arrangements?id=${encodeURIComponent(arrangementId)}`, {
    method: "DELETE",
    cookie: adminUser.cookie,
    expectStatus: 200,
  });
  const afterDeactivation = await api("/api/overseas-arrangements?country=United%20Kingdom", { expectStatus: 200 });
  assert(
    !afterDeactivation.data.data.arrangements.some((arrangement) => arrangement.locationName === locationName),
    "deactivated arrangement is no longer shown to citizens",
  );

  const statusNote = "Prototype next step: check official NCRA guidance before making any plans.";
  await api(`/api/admin/applications/${ukApplicationId}`, {
    method: "PATCH",
    cookie: adminUser.cookie,
    body: { status: "under_review", note: statusNote },
    expectStatus: 200,
  });
  const updatedDetail = await api(`/applications/${ukApplicationId}`, { cookie: ukUser.cookie, expectStatus: 200 });
  assert(updatedDetail.text.includes(statusNote), "admin prototype status note appears in the applicant timeline");

  console.log("Database verification");
  const db = new DatabaseSync(DB_PATH);
  try {
    const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(applicationId);
    assert(row.user_id === userA.userId, "application belongs to the correct authenticated citizen");
    assert(row.status === "submitted" && row.submitted_at, "database record is Submitted with a submission date");
    assert(String(row.photo_storage_path).startsWith("db://photos/"), "database stores the photograph reference");
    assert(Boolean(row.photo_document_id), "database links the active photograph document");

    const savedForm = JSON.parse(row.form_data);
    assert(savedForm.fullName === correctedName, "corrected form information is stored");
    assert(savedForm.phone === "+23276123456", "phone number is normalised and stored");
    assert(savedForm.countryOfBirth === "Sierra Leone", "local application records country of birth");

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

    const ukRow = db.prepare("SELECT * FROM applications WHERE id = ?").get(ukApplicationId);
    const ukSavedForm = JSON.parse(ukRow.form_data);
    assert(ukRow.user_id === ukUser.userId, "overseas application belongs to the UK account");
    assert(ukSavedForm.applicationLocation === "abroad", "overseas route is stored separately");
    assert(ukSavedForm.countryOfResidence === "United Kingdom", "country of residence is stored");
    assert(ukSavedForm.countryOfBirth === "Sierra Leone", "country of birth is stored separately");
    assert(ukSavedForm.nationality === "Sierra Leonean", "nationality is stored separately");
    assert(ukSavedForm.residentialAddress === "", "no Sierra Leone residential address is required abroad");
    assert(ukSavedForm.phone === "+447700900123", "international phone is normalised and stored");
    assert(ukSavedForm.timeZone === "Europe/London", "applicant time zone is stored for date display");

    const ukDocuments = db
      .prepare("SELECT * FROM documents WHERE application_id = ? AND doc_type = 'supporting_document' AND is_active = 1")
      .all(ukApplicationId);
    assert(ukDocuments.length === 1, "one active supporting document is stored for the overseas application");
    assert(!Buffer.from(ukDocuments[0].content).equals(SAMPLE_PDF), "supporting document bytes are encrypted at rest");
    assert(ukDocuments[0].checksum === crypto.createHash("sha256").update(SAMPLE_PDF).digest("hex"), "supporting document checksum matches the sample");

    const outbox = db.prepare("SELECT * FROM notification_outbox WHERE application_id = ?").all(ukApplicationId);
    const channels = new Set(outbox.map((message) => message.channel));
    assert(channels.has("email") && channels.has("whatsapp"), "email and WhatsApp queue entries are recorded");
    assert(outbox.every((message) => message.status === "queued_not_sent"), "no queued message claims delivery");

    const ukUserRow = db.prepare("SELECT * FROM users WHERE id = ?").get(ukUser.userId);
    assert(ukUserRow.country_of_residence === "United Kingdom", "UK country of residence is stored on the account");
    assert(ukUserRow.email_verified === 1, "email verification flag is set after prototype verification");
    const usUserRow = db.prepare("SELECT * FROM users WHERE id = ?").get(usUser.userId);
    assert(usUserRow.country_of_residence === "United States", "US country of residence is stored on the account");
    assert(usUserRow.phone === "+12025550123", "US international phone is normalised");

    const inactiveArrangement = db.prepare("SELECT * FROM overseas_arrangements WHERE id = ?").get(arrangementId);
    assert(inactiveArrangement.is_active === 0, "deactivated arrangement remains in the audit trail but is hidden");

    const adminStatusEvent = db
      .prepare("SELECT * FROM application_events WHERE application_id = ? AND to_status = 'under_review'")
      .all(ukApplicationId);
    assert(adminStatusEvent.length === 1, "admin prototype status change is recorded once");
  } finally {
    db.close();
  }

  console.log(`\nAll local and overseas ID application checks passed. Local reference: ${reference}. UK reference: ${ukReference}.`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
