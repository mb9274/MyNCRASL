import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ALL_FIELDS,
  applicantsName,
  formatApplicationDate,
  STATUS_INFO,
} from "@/lib/application-config";
import { getCurrentUser } from "@/lib/auth";
import { findApplicationForUser, listApplicationEvents } from "@/lib/db";
import type { ApplicationStatus } from "@/lib/types";

function asString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not provided";
}

function badgeClass(status: ApplicationStatus): string {
  if (status === "approved" || status === "completed" || status === "ready_for_collection") return "bg-brand-100 text-brand-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "submitted" || status === "under_review" || status === "verification_pending") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-ink-500";
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const application = findApplicationForUser(user.id, id);
  if (!application) notFound();

  const events = listApplicationEvents(user.id, id);
  const info = STATUS_INFO[application.status];
  const name = applicantsName(application.formData);
  const previewUrl = application.photoStoragePath ? `/api/applications/${id}/photo` : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/applications" className="text-sm font-semibold text-brand-700 hover:underline">← Back to my applications</Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Application details</p>
          <h1 className="mt-1 text-3xl font-bold">{name}</h1>
          <p className="mt-2 text-sm text-ink-500">
            Reference <span className="font-semibold text-ink-900">{application.reference}</span> ·{" "}
            {application.status === "draft"
              ? `Started ${formatApplicationDate(application.createdAt)}`
              : `Submitted ${formatApplicationDate(application.submittedAt)}`}
          </p>
        </div>
        <span className={`badge ${badgeClass(application.status)}`}>{info.label}</span>
      </header>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This is a proposed test application in a prototype. It has <strong>not</strong> been sent to NCRA and cannot be used
        to issue an identity card. Only authorised staff can change official verification decisions.
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">Applicant information</h2>
          <p className="mt-1 text-sm text-ink-500">The information saved with this application.</p>
          <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {ALL_FIELDS.map((field) => (
              <div key={field.key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{field.label}</dt>
                <dd className="mt-0.5 break-words text-sm font-semibold text-ink-900">{asString(application.formData[field.key])}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold">Passport photograph</h2>
          <p className="mt-1 text-sm text-ink-500">Visible only to the account that owns this application.</p>
          <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={`Passport photograph for ${name}`} className="h-full w-full object-contain" />
            ) : (
              <span className="text-4xl text-slate-400" aria-label="No photograph uploaded">▣</span>
            )}
          </div>
          {application.photoOriginalName && (
            <p className="mt-3 break-all text-xs text-ink-500">{application.photoOriginalName}</p>
          )}
          <p className="mt-2 text-xs text-ink-500">Logical reference: {application.photoStoragePath ?? "none"}</p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">Status and next steps</h2>
          <p className="mt-2 text-sm text-ink-700">{info.description}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-500">
            {info.nextSteps.map((step) => <li key={step}>{step}</li>)}
          </ul>
          {application.status === "draft" && (
            <Link href="/apply" className="btn-primary mt-5">Continue this draft</Link>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold">Status history</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No status changes recorded.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-brand-100 pl-4">
                  <p className="text-sm font-semibold">{STATUS_INFO[event.toStatus].label}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{formatApplicationDate(event.createdAt)}</p>
                  {event.note && <p className="mt-1 text-xs text-ink-500">{event.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
