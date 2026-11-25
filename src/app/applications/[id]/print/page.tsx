import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  STATUS_INFO,
  applicantsName,
  countryOfResidence,
  fieldsForApplication,
  formatApplicationDate,
  timeZoneForApplication,
} from "@/lib/application-config";
import { PrintButton } from "@/components/application/print-button";
import { getCurrentUser } from "@/lib/auth";
import { findApplicationForUser } from "@/lib/db";

function asString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not provided";
}

export default async function PrintConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const application = findApplicationForUser(user.id, id);
  if (!application) notFound();

  if (application.status === "draft") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold">Nothing to print yet</h1>
          <p className="mt-2 text-sm text-ink-500">Submit this prototype application before printing a confirmation.</p>
          <Link href="/apply" className="btn-primary mt-5">Continue the application</Link>
        </div>
      </div>
    );
  }

  const name = applicantsName(application.formData);
  const info = STATUS_INFO[application.status];
  const timeZone = timeZoneForApplication(application.formData);
  const previewUrl = application.photoStoragePath ? `/api/applications/${application.id}/photo` : "";
  const fields = fieldsForApplication(application.formData).filter((field) => asString(application.formData[field.key]) !== "Not provided");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print-hide">
        <Link href={`/applications/${application.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
          ← Back to application
        </Link>
        <PrintButton />
      </div>

      <article className="card relative overflow-hidden border-2 border-amber-300 bg-white p-6 sm:p-10">
        <div className="print-watermark pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="rotate-[-30deg] whitespace-nowrap text-4xl font-black uppercase tracking-widest text-red-700/10 sm:text-6xl">
            NOT AN OFFICIAL ID
          </span>
        </div>

        <header className="relative border-b-2 border-ink-900 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-700">MyNCRA prototype</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Application confirmation</h1>
              <p className="mt-1 text-sm text-ink-500">Printed proof of a test application — not an identity card.</p>
            </div>
            <div className="rounded-xl border-2 border-red-700 bg-red-50 px-4 py-3 text-center text-red-800">
              <p className="text-lg font-black uppercase leading-tight">Not an official ID</p>
              <p className="mt-1 text-xs font-semibold">Prototype only · No legal status</p>
            </div>
          </div>
        </header>

        <div className="relative mt-6 grid gap-6 sm:grid-cols-[140px_1fr]">
          <div className="flex h-44 w-32 items-start justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={`Passport photograph for ${name}`} className="h-full w-full object-cover" />
            ) : (
              <span className="mt-16 text-3xl text-slate-400" aria-label="No photograph uploaded">▣</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Applicant</p>
            <p className="mt-1 text-xl font-bold">{name}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Application reference</p>
            <p className="break-all text-xl font-bold text-brand-700">{application.reference}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Status</p>
            <p className="font-semibold">{info.label}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Submitted</p>
            <p className="font-semibold">{formatApplicationDate(application.submittedAt, timeZone)}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-500">Country of residence</p>
            <p className="font-semibold">{countryOfResidence(application.formData)}</p>
          </div>
        </div>

        <section className="relative mt-8">
          <h2 className="text-lg font-bold">Information saved in this prototype</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className="break-words">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{field.label}</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">{asString(application.formData[field.key])}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="relative mt-8 border-t border-slate-300 pt-5 text-xs text-ink-700">
          <p className="font-bold uppercase tracking-wide text-red-700">Important</p>
          <p className="mt-1">
            This document was generated by a concept prototype. It has not been sent to NCRA, does not confirm identity,
            does not authorise travel or an appointment, and cannot be used to obtain or print an official National ID.
            Only official NCRA channels can issue identity documents or confirm verification arrangements.
          </p>
          <p className="mt-3">Account holder: {user.fullName} · Reference {application.reference}</p>
        </footer>
      </article>
    </div>
  );
}
