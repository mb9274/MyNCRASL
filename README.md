# MyNCRA

**One platform. Every Sierra Leonean. Everywhere.**

A proposed digital access platform for national identity and civil registration services in Sierra Leone, built from the
product requirements document (PRD v1.0). This repository is a working concept prototype that implements the PRD features
one at a time.

> ⚠️ **Demonstration build.** MyNCRA is a proposed concept, not an official NCRA system. It is not affiliated with or
> approved by the National Civil Registration Authority. No real identity data is processed, no official records are
> changed, and no biometric or legal verification is performed. Real deployment requires NCRA approval, authorised
> integrations and legal/privacy review.

## Stack

- **Web:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4. Responsive, mobile-friendly web first;
  native Android/iOS wrappers are a later phase.
- **Data:** SQLite via Node's built-in `node:sqlite` (zero external services). The data-access layer in `src/lib/db.ts`
  is isolated so it can be swapped for PostgreSQL later, as the PRD suggests. There is no Supabase project, Supabase
  auth or RLS policy in this prototype. Instead, every application, photo, document, event and notification query is
  scoped by `user_id`, and admin-only endpoints use role checks.
- **Documents:** passport photographs and supporting documents are AES-256-GCM encrypted and stored as SQLite BLOBs
  behind logical references such as `db://photos/<applicationId>/<uuid>` and `db://documents/<applicationId>/<uuid>`.
  No temporary local file path is persisted.
- **Auth:** server-side sessions (httpOnly cookie), scrypt password hashing, hashed verification codes, role-based access.
  International phone numbers are stored in E.164-like form (`+447700900123`); `+44` and `0044` input styles are accepted.
- **Validation:** Zod.
- **VoiceBridge:** will use a pluggable provider interface. A local demo provider ships first; real speech/translation
  models are only connected after native-speaker validation and NCRA approval.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The SQLite database is created automatically at `data/myncra.db`.

Useful scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:id-app`.

### Environment variables

| Variable | Purpose |
| -------- | ------- |
| `MYNCRA_DB_PATH` | Optional SQLite file path. Defaults to `data/myncra.db` locally and `/tmp/myncra.db` on Vercel. |
| `MYNCRA_STORAGE_KEY` | **Set in production.** Secret used to derive the photo/document encryption key. The built-in development fallback is not secure. |
| `MYNCRA_HIDE_DEMO_CODES` | Set to `true` to hide/skip displaying demo verification codes. |

> On Vercel the filesystem outside `/tmp` is read-only, so the default SQLite database is ephemeral. This is suitable for
> the public demo only; a real deployment needs an NCRA-approved persistent database and managed key storage.

### Demo verification codes

There is no SMS, email or WhatsApp gateway in this prototype. The 6-digit verification code is shown on the verification
screen (and returned by the API) so the flow can be tested end to end. Set `MYNCRA_HIDE_DEMO_CODES=true` to suppress
this. Submission creates entries in a prototype outbox with status `queued_not_sent`; those entries explicitly state
that nothing was delivered.

## Feature build order (PRD roadmap)

| Step | Feature | PRD module / phase | Status |
| ---- | ------- | ------------------ | ------ |
| 1 | Foundation, accounts, verification, language selection | FR-01/02, Phase 3 | ✅ Done |
| 2 | National ID application + photograph upload + reference number | FR-03/04, Phase 3 | ✅ Done (prototype) |
| 3 | Application tracking, status history, notifications | FR-06/07, Phase 3 | ✅ Done (prototype); appointments still pending |
| 4 | Staff & administration portal | FR-08/09, Phase 4 | 🟡 Prototype status/arrangement controls only |
| 5 | VoiceBridge (voice notes, translation, TTS, human escalation) | FR-10/11/12, Phase 5 | ⏳ |
| 6 | Community Connect (assisted access, USSD/SMS) | FR-15/17, Phase 6 | ⏳ |
| 7 | Diaspora + Digital Wallet | FR-13/14, Phase 7 | 🟡 Diaspora application done; wallet pending |
| 8 | Civil registration services + hardening | FR-16, Phase 8 | ⏳ |

## Homepage entry routes and card showcase

The homepage offers two clear entry points: **Apply for Your National ID** (`/apply?from=sl`) and **I'm Living Abroad**
(`/apply?from=abroad`). It also includes an interactive front/back card showcase shell with floating motion and 3D
perspective. Because the official card design has not been supplied and approved, the showcase is explicitly labelled
`Design pending`, `Sample preview` and `NOT AN OFFICIAL ID`. No card layout, colours, seal, typography or citizen data
has been invented. Replace the two faces when the confirmed design is provided.

## National ID application (prototype)

The application flow is available at `/apply` for signed-in citizens and is deliberately labelled as a **test
application**. It has not been sent to NCRA and cannot be used to issue an identity card.

- **Two location routes:** `/apply?from=sl` for applicants in Sierra Leone and `/apply?from=abroad` for Sierra Leoneans
  living outside Sierra Leone. The form can also be switched inside the application.
- **Three-step form:** applicant details, address/contact, photograph/documents/review. Every step shows inline
  validation errors.
- **Separate origin fields:** nationality, country of birth, country of residence and residential address are stored
  separately. Overseas applicants enter their current country, address abroad, city and international phone; they are
  **not** asked for a Sierra Leone residential address. Optional Sierra Leone district/chiefdom origin fields remain
  available.
- **Country list:** `src/lib/countries.ts` provides a configurable list including United Kingdom, United States, Canada,
  Germany, France, Ghana, Nigeria, The Gambia and Other countries. Dial codes and time zones are stored with each option.
- **Configurable rules:** field definitions, district/country options and status labels live in
  `src/lib/application-config.ts`. Fields whose official requirement has not been confirmed by NCRA are marked
  `unconfirmed` and shown as "Official requirement to be confirmed by NCRA." No official eligibility rule has been invented.
- **Draft saving:** values autosave to the browser and to `/api/applications/draft`; an existing draft resumes on return.
- **Passport photograph:** JPEG/JPG/PNG only, 5 MB limit, magic-byte validation, preview, remove and replace. The preview
  is served only from `/api/applications/[id]/photo` to the authenticated owner with `private, no-store` headers.
- **Supporting documents:** PDF/JPEG/JPG/PNG, 5 MB per file, magic-byte validation, up to five files. Bytes are encrypted
  at rest and served only to the application owner through `/api/applications/[id]/documents/[documentId]`. At least one
  document is required for an overseas submission; documents remain optional locally to preserve the original flow.
- **Submission:** the button reads `SUBMIT ID APPLICATION`. The server revalidates all fields, the photograph and the
  overseas document requirement, saves the record with status `Submitted`, generates a reference such as
  `NCRA-2026-AB12CD34`, and shows a confirmation. A repeated click cannot create a second submission.
- **Tracking:** `/applications` lists only the signed-in user's records with reference, photo, status, country of
  residence and next steps. `/applications/[id]` shows submitted information, the photograph, supporting documents and a
  status timeline. The dashboard uses the same scoped data and shows the prototype outbox.
- **Overseas instructions:** if an administrator has configured an authorised arrangement for the applicant's country,
  it is shown on `/diaspora` and on the application detail page. With the default empty configuration, applicants are
  told that no authorised overseas arrangement exists and not to make appointment or travel plans.
- **Printed confirmation:** `/applications/[id]/print` produces a prototype receipt, never an ID card. It is stamped
  `NOT AN OFFICIAL ID`, states that it has no legal status, and includes the reference, status, submission date in the
  applicant's time zone, photograph and saved application details.
- **Access control:** every application, document, photo, event and outbox query is scoped by `user_id`. Another citizen
  receives `404` for another user's application, photo, document or print page. Citizens have no staff/admin decision
  endpoints.

## Diaspora registration

`/register?from=abroad` preselects the overseas route. Applicants choose a country of residence, enter an international
dial code and number, and must provide an email address. Login accepts either the stored international number, an email
address or a legacy Sierra Leone number. Verification uses the same prototype demo code flow; accounts with an email
address are marked `emailVerified` after the code is accepted. Nothing is sent externally.

## Staff and administration (prototype-only)

Admin accounts can access:

- `/staff/applications` — list submitted prototype applications and record a status change with a short applicant note.
  This creates a timeline event, in-app notification, outbox entries and an audit log. It is not an official decision.
- `/staff/overseas-arrangements` — add, edit and deactivate overseas arrangement notes. The system ships with no
  arrangements and never invents embassies, consulates, centres, partnerships, appointment procedures or card issuance.

These pages and the matching `/api/admin/*` endpoints are gated by `requireRole(["admin"])`. Citizen requests receive
`403`.

## Fictional-data integration test

With the dev server running:

```bash
npm run test:id-app
```

The test registers fictional local, UK and US accounts; checks international login with `+` and `00` prefixes; exercises
local validation, photo upload/removal/replacement, submission and idempotency; checks homepage entry routes and the
design-pending showcase; verifies local dashboard, tracking and print pages; tests overseas document validation, upload,
download, submission and print output; checks cross-user `404`s; exercises citizen `403`s and admin status/arrangement
controls; and verifies database scoping, field separation, encryption, outbox status and audit events. It uses only
fictional names and generated sample files. Fictional records are added to the local database each time the test runs.

## What works today

- Landing page with two application entry routes and a responsive design-pending card showcase.
- Create an account locally or from abroad, with Sierra Leone or international phone normalisation.
- Phone/email verification with a 6-digit prototype code (demo code displayed).
- Secure sign in / sign out with server-side sessions.
- **English-only interface.** All platform text is in English. Local languages are planned as VoiceBridge *audio*
  assistance in a later feature, not as translated UI text.
- Citizen dashboard with service tiles, notifications, outbox, diaspora instructions and real application records.
- Multi-step national ID application with local/overseas branches, encrypted photographs and supporting documents,
  submission and reference generation.
- Application list, detail view, status timeline, overseas instructions and prototype confirmation printing.
- Prototype admin controls for status notes and overseas arrangement configuration.
- Audit logging of sensitive account, application and admin actions.

## Project layout

```
src/
  app/
    apply/                 # National ID application page (?from=sl|abroad)
    applications/          # Tracking list, detail and print confirmation pages
    diaspora/              # Public overseas guide and configured arrangement view
    staff/                 # Admin-only status and arrangement pages
    api/applications/      # Draft, detail, photo, documents and submit route handlers
    api/admin/             # Admin-only application and arrangement endpoints
    api/overseas-arrangements/ # Public read-only arrangement view
    ...                    # Existing pages and auth routes
  components/
    application/           # NationalIdForm and PrintButton
    admin/                 # Status and overseas arrangement managers
    national-id-showcase.tsx
    ...                    # Shared UI
  lib/
    application-config.ts  # Configurable fields, countries, districts and status copy
    application-validation.ts
    countries.ts           # Country dial codes and time zones
    storage.ts             # Photo/document validation and AES-256-GCM encryption
    db, auth, i18n, types, validation, http helpers
scripts/
  test-id-application.mjs  # Fictional-data local and overseas end-to-end check
data/                      # SQLite database (gitignored)
```

## Safety & compliance notes

- Passwords are hashed with scrypt; sessions and verification codes are stored hashed.
- Role-based access helpers (`requireRole`) gate staff/admin features. No citizen can change an official decision.
- Audit logs record account, application and admin actions.
- Uploaded photographs and supporting documents are encrypted at rest with AES-256-GCM; production must set
  `MYNCRA_STORAGE_KEY` and use managed key storage. The development fallback key is not secure.
- Photo/document bytes are never exposed from a public static path or referenced by a temporary local file path.
- Email, WhatsApp and SMS are represented only by a prototype outbox with status `queued_not_sent`; no external gateway
  is connected and no delivery is claimed.
- Printed output is a prototype confirmation stamped `NOT AN OFFICIAL ID`; it cannot be used as identity documentation.
- The card showcase is a neutral placeholder until the actual approved design is supplied.
- Voice data will require explicit consent and a retention/deletion policy before any real processing.
- The demo stores data in SQLite on Vercel's ephemeral `/tmp`; no real identity data should be entered.

## Still requires NCRA approval or integration

- Confirmation of the official application form, required fields and eligibility rules, including gender/contact fields
  currently marked as unconfirmed.
- Confirmation of the official overseas registration route, authorised locations, document requirements, verification
  arrangements and card collection/issuance process. No such arrangements are seeded or invented.
- The actual approved National ID card front/back design for the homepage showcase.
- Approved photograph/document specifications and a secure document-storage/KMS service.
- An official backend integration for submission, status updates and reference numbers.
- Authorised staff workflows and audit requirements for review, verification and card decisions.
- A real notification gateway only after legal/privacy approval.
- Legal/privacy review, retention/deletion policy, accessibility audit and penetration testing before any real use.
