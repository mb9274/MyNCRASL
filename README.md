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
  is isolated so it can be swapped for PostgreSQL later, as the PRD suggests.
- **Documents:** passport photographs are AES-256-GCM encrypted and stored as SQLite BLOBs behind a logical reference
  such as `db://photos/<applicationId>/<uuid>`. No temporary local file path is persisted.
- **Auth:** server-side sessions (httpOnly cookie), scrypt password hashing, hashed verification codes, role-based access.
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
| `MYNCRA_STORAGE_KEY` | **Set in production.** Secret used to derive the photo encryption key. The built-in development fallback is not secure. |
| `MYNCRA_HIDE_DEMO_CODES` | Set to `true` to hide/skip displaying demo verification codes. |

> On Vercel the filesystem outside `/tmp` is read-only, so the default SQLite database is ephemeral. This is suitable for
> the public demo only; a real deployment needs an NCRA-approved persistent database and managed key storage.

### Demo verification codes

There is no SMS/email gateway in this prototype, so the 6-digit verification code is shown on the verification screen
(and returned by the API) so the flow can be tested end to end. Set `MYNCRA_HIDE_DEMO_CODES=true` to suppress this.

## Feature build order (PRD roadmap)

| Step | Feature | PRD module / phase | Status |
| ---- | ------- | ------------------ | ------ |
| 1 | Foundation, accounts, verification, language selection | FR-01/02, Phase 3 | ✅ Done |
| 2 | National ID application + photograph upload + reference number | FR-03/04, Phase 3 | ✅ Done (prototype) |
| 3 | Application tracking, status history, notifications | FR-06/07, Phase 3 | ✅ Done (prototype); appointments still pending |
| 4 | Staff & administration portal | FR-08/09, Phase 4 | ⏳ |
| 5 | VoiceBridge (voice notes, translation, TTS, human escalation) | FR-10/11/12, Phase 5 | ⏳ |
| 6 | Community Connect (assisted access, USSD/SMS) | FR-15/17, Phase 6 | ⏳ |
| 7 | Diaspora + Digital Wallet | FR-13/14, Phase 7 | ⏳ |
| 8 | Civil registration services + hardening | FR-16, Phase 8 | ⏳ |

## Digital ID application (prototype)

The application flow is available at `/apply` for signed-in citizens and is deliberately labelled as a **test
application**. It has not been sent to NCRA and cannot be used to issue an identity card.

- **Three-step form:** applicant details, address/contact, photograph/review. Every step shows inline validation errors.
- **Fields collected:** full name, date of birth, place of birth, gender, nationality (plus "other" specification),
  existing ID number if any, residential address, district, chiefdom, section/community, phone, email where applicable,
  and preferred contact method.
- **Configurable rules:** field definitions, district options and status labels live in `src/lib/application-config.ts`.
  Fields whose official requirement has not been confirmed by NCRA are marked `unconfirmed` and shown as
  "Official requirement to be confirmed by NCRA." No official eligibility rule has been invented.
- **Draft saving:** values autosave to the browser and to `/api/applications/draft`; an existing draft resumes on return.
- **Passport photograph:** JPEG/JPG/PNG only, 5 MB limit, magic-byte validation, preview, remove and replace. The preview
  is served only from `/api/applications/[id]/photo` to the authenticated owner with `private, no-store` headers.
- **Submission:** the button reads `SUBMIT ID APPLICATION`. The server revalidates all fields and the photograph, saves
  the record with status `Submitted`, generates a reference such as `NCRA-2026-AB12CD34`, and shows a confirmation. A
  repeated click cannot create a second submission.
- **Tracking:** `/applications` lists only the signed-in user's records with reference, photo, status and next steps.
  `/applications/[id]` shows submitted information, the photograph and a status timeline. The dashboard uses the same
  scoped data.
- **Access control:** every application, document, photo and event query is scoped by `user_id`. Another citizen receives
  `404` for another user's application or photograph. Citizens have no staff/admin decision endpoints.

### Fictional-data integration test

With the dev server running:

```bash
npm run test:id-app
```

It registers two fictional users, exercises validation, photo upload/removal/replacement, submission, duplicate-click
idempotency, tracking pages, cross-user 404s and the database state. It uses only fictional names and a generated sample
PNG. Fictional records are added to the local database each time the test runs.

## What works today (Steps 1–3)

- Landing page describing all seven modules and the accessibility principle.
- Create an account (citizen or community assistant) with Sierra Leone phone normalisation.
- Phone/email verification with a 6-digit code (demo code displayed).
- Secure sign in / sign out with server-side sessions.
- **English-only interface.** All platform text is in English. Local languages are planned as VoiceBridge *audio*
  assistance in a later feature, not as translated UI text.
- Citizen dashboard with service tiles, notifications and real application records.
- Multi-step national ID application, encrypted photograph storage, submission and reference generation.
- Application list, detail view, status timeline and next steps.
- Audit logging of sensitive account actions.

## Project layout

```
src/
  app/
    apply/                 # National ID application page
    applications/          # Tracking list and detail pages
    api/applications/      # Draft, detail, photo and submit route handlers
    ...                    # Existing pages and auth routes
  components/
    application/           # NationalIdForm
    ...                    # Shared UI
  lib/
    application-config.ts  # Configurable fields, districts and status copy
    application-validation.ts
    storage.ts             # Photo validation and AES-256-GCM encryption
    db, auth, i18n, types, validation, http helpers
scripts/
  test-id-application.mjs  # Fictional-data end-to-end check
data/                      # SQLite database (gitignored)
```

## Safety & compliance notes

- Passwords are hashed with scrypt; sessions and verification codes are stored hashed.
- Role-based access helpers (`requireRole`) gate staff/admin features. No citizen can change an official decision.
- Audit logs record account and application actions.
- Uploaded passport photographs are encrypted at rest with AES-256-GCM; production must set `MYNCRA_STORAGE_KEY` and use
  managed key storage. The development fallback key is not secure.
- Photograph bytes are never exposed from a public static path or referenced by a temporary local file path.
- Voice data will require explicit consent and a retention/deletion policy before any real processing.
- The demo stores data in SQLite on Vercel's ephemeral `/tmp`; no real identity data should be entered.

## Still requires NCRA approval or integration

- Confirmation of the official application form, required fields and eligibility rules, including gender/contact fields
  currently marked as unconfirmed.
- Approved photograph specifications and a secure document-storage/KMS service.
- An official backend integration for submission, status updates and reference numbers.
- Authorised staff workflows and audit requirements for review, verification and card decisions.
- Legal/privacy review, retention/deletion policy, accessibility audit and penetration testing before any real use.
