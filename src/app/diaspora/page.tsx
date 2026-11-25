import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import { getCurrentUser } from "@/lib/auth";
import { listOverseasArrangements } from "@/lib/db";
import { formatApplicationDate } from "@/lib/application-config";

export default async function DiasporaPage() {
  const user = await getCurrentUser();
  const country = user?.countryOfResidence && user.countryOfResidence !== "Sierra Leone"
    ? user.countryOfResidence
    : null;
  const arrangements = listOverseasArrangements(country ?? undefined);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="card overflow-hidden">
        <div className="bg-ink-900 p-6 text-white sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">International diaspora</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Apply from where you live now</h1>
          <p className="mt-3 max-w-3xl text-slate-200">
            Sierra Leoneans outside Sierra Leone can start the same prototype national ID application, upload a
            photograph and supporting documents, receive a reference and track progress from any country. You do not
            need to enter a Sierra Leone residential address in this route.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={user ? "/apply?from=abroad" : "/register?from=abroad"} className="btn bg-gold-500 px-6 text-ink-950 hover:bg-amber-400">
              {user ? "Start overseas application" : "Create a diaspora account"}
            </Link>
            <Link href="/apply?from=abroad" className="btn border border-white/30 text-white hover:bg-white/10">
              Continue to application
            </Link>
          </div>
        </div>
        <div className="border-t border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <strong>Prototype notice:</strong> this is not an official NCRA service. No embassy, consulate, overseas
          registration centre, biometric appointment or card collection arrangement is authorised or promised here.
          Do not travel or make plans based on this demonstration.
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">How the prototype works</h2>
          <ol className="mt-5 space-y-5">
            {[
              ["Create a citizen account", "Choose your country of residence and enter an international phone number and email address."],
              ["Verify the demo account", "The prototype displays a verification code; no external email or WhatsApp message is sent."],
              ["Complete the application", "Keep nationality, country of birth, country of residence and residential address separate."],
              ["Upload documents", "Add a passport photograph and at least one supporting document."],
              ["Submit and track", "Receive a prototype reference number and follow the status in your dashboard."],
              ["Print a confirmation", "Print a clearly marked prototype confirmation. It is not an identity card."],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{index + 1}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold">Countries available</h2>
          <p className="mt-1 text-sm text-ink-500">This configurable prototype list includes:</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ink-700">
            {COUNTRIES.filter((entry) => entry.value !== "Sierra Leone").map((entry) => (
              <li key={entry.value}>{entry.label}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-500">“Other countries” is also available, with a manual country code.</p>
        </div>
      </section>

      <section className="card mt-8 p-6">
        <h2 className="text-xl font-bold">Overseas verification and issuance</h2>
        <p className="mt-2 text-sm text-ink-500">
          Only authorised NCRA administrators can add overseas arrangements. This prototype ships with none, so no
          location or appointment should be assumed.
        </p>
        {arrangements.length === 0 ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-ink-700">
            <p className="font-semibold">No authorised overseas arrangement is configured{country ? ` for ${country}` : ""}.</p>
            <p className="mt-1">
              Next step in this prototype: complete and submit your test application, keep the reference number and
              check official NCRA channels before making any appointment or travel plans.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {arrangements.map((arrangement) => (
              <article key={arrangement.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{arrangement.country}</p>
                <h3 className="mt-1 font-bold">{arrangement.locationName}</h3>
                <p className="mt-0.5 text-xs text-ink-500">{arrangement.locationType}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="font-semibold">Appointment availability</dt><dd className="text-ink-500">{arrangement.appointmentAvailability}</dd></div>
                  <div><dt className="font-semibold">Verification instructions</dt><dd className="text-ink-500">{arrangement.verificationInstructions}</dd></div>
                  <div><dt className="font-semibold">Collection or issuance</dt><dd className="text-ink-500">{arrangement.collectionInstructions}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-ink-500">Updated {formatApplicationDate(arrangement.updatedAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
