import Link from "next/link";
import { redirect } from "next/navigation";
import { applicantsName, formatApplicationDate, STATUS_INFO } from "@/lib/application-config";
import { getCurrentUser } from "@/lib/auth";
import { listApplicationsForUser } from "@/lib/db";
import type { ApplicationStatus } from "@/lib/types";

function badgeClass(status: ApplicationStatus): string {
  if (status === "approved" || status === "completed" || status === "ready_for_collection") return "bg-brand-100 text-brand-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "submitted" || status === "under_review" || status === "verification_pending") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-ink-500";
}

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const applications = listApplicationsForUser(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Tracking</p>
          <h1 className="mt-1 text-3xl font-bold">My applications</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Follow each test application from Draft to Completed. These records are held in this prototype and have not
            been sent to NCRA.
          </p>
        </div>
        <Link href="/apply" className="btn-primary">Start an application</Link>
      </div>

      {applications.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <h2 className="text-xl font-bold">No applications yet</h2>
          <p className="mt-2 text-sm text-ink-500">
            When you start an application, its reference number, photograph, status and next steps will appear here.
          </p>
          <Link href="/apply" className="btn-primary mt-5">Start an application</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {applications.map((application) => {
            const info = STATUS_INFO[application.status];
            const name = applicantsName(application.formData);
            const isDraft = application.status === "draft";
            const previewUrl = application.photoStoragePath ? `/api/applications/${application.id}/photo` : "";
            const submittedLabel = isDraft ? `Started ${formatApplicationDate(application.createdAt)}` : `Submitted ${formatApplicationDate(application.submittedAt)}`;

            return (
              <article key={application.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt={`Passport photograph for ${name}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl text-slate-400" aria-label="No photograph uploaded">▣</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">{application.reference}</p>
                      <h2 className="mt-1 text-lg font-bold">{name}</h2>
                      <p className="mt-0.5 text-sm text-ink-500">{submittedLabel}</p>
                      <p className="mt-0.5 text-xs text-ink-500">Photograph visible only to your signed-in account.</p>
                    </div>
                  </div>
                  <span className={`badge ${badgeClass(application.status)}`}>{info.label}</span>
                </div>

                <p className="mt-4 text-sm text-ink-700">{info.description}</p>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">Next steps</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-500">
                    {info.nextSteps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {isDraft ? (
                    <Link href="/apply" className="btn-primary">Continue draft</Link>
                  ) : (
                    <Link href={`/applications/${application.id}`} className="btn-primary">View application</Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
