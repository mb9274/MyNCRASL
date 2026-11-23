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

Useful scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

### Demo verification codes

There is no SMS/email gateway in this prototype, so the 6-digit verification code is shown on the verification screen
(and returned by the API) so the flow can be tested end to end. Set `MYNCRA_HIDE_DEMO_CODES=true` to suppress this.

## Feature build order (PRD roadmap)

| Step | Feature | PRD module / phase | Status |
| ---- | ------- | ------------------ | ------ |
| 1 | Foundation, accounts, verification, language selection | FR-01/02, Phase 3 | ✅ Done |
| 2 | National ID application + document upload + reference number | FR-03/04, Phase 3 | ⏳ Next |
| 3 | Appointments, application tracking, notifications | FR-05/06/07, Phase 3 | ⏳ |
| 4 | Staff & administration portal | FR-08/09, Phase 4 | ⏳ |
| 5 | VoiceBridge (voice notes, translation, TTS, human escalation) | FR-10/11/12, Phase 5 | ⏳ |
| 6 | Community Connect (assisted access, USSD/SMS) | FR-15/17, Phase 6 | ⏳ |
| 7 | Diaspora + Digital Wallet | FR-13/14, Phase 7 | ⏳ |
| 8 | Civil registration services + hardening | FR-16, Phase 8 | ⏳ |

## What works today (Step 1)

- Landing page describing all seven modules and the accessibility principle.
- Create an account (citizen or community assistant) with Sierra Leone phone normalisation.
- Phone/email verification with a 6-digit code (demo code displayed).
- Secure sign in / sign out with server-side sessions.
- **English-only interface.** All platform text is in English. Local-language support (Krio, Mende, Temne, Limba, Fula,
  Kono, Loko) is planned as VoiceBridge *audio* assistance in a later feature, not as translated UI text.
- Citizen dashboard with service tiles and notification area.
- Audit logging of sensitive account actions.

## Project layout

```
src/
  app/            # Routes (pages + API route handlers)
  components/     # Shared UI (header, footer, language picker, forms)
  lib/            # db, auth, i18n, types, validation, http helpers
data/             # SQLite database (gitignored)
```

## Safety & compliance notes

- Passwords are hashed with scrypt; sessions and verification codes are stored hashed.
- Role-based access helpers (`requireRole`) gate staff/admin features.
- Audit logs record account and (later) application/staff actions.
- Voice data will require explicit consent and a retention/deletion policy before any real processing.
- Uploaded documents will be stored encrypted with controlled access; screenshots are never treated as official identity.
