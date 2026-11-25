import Link from "next/link";
import { redirect } from "next/navigation";
import {
  STATUS_INFO,
  applicantsName,
  countryOfResidence,
  formatApplicationDate,
  isDiaspora,
  timeZoneForApplication,
} from "@/lib/application-config";
import { getCurrentUser, getLanguagePreference } from "@/lib/auth";
import { listApplicationsForUser, listNotificationOutbox, listNotifications, listOverseasArrangements } from "@/lib/db";
import { translate } from "@/lib/i18n";
import { displayPhone } from "@/lib/validation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const lang = await getLanguagePreference();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  const notifications = listNotifications(user.id);
  const outbox = listNotificationOutbox(user.id);
  const applications = listApplicationsForUser(user.id);
  const overseasCountry = user.countryOfResidence && user.countryOfResidence !== "Sierra Leone"
    ? user.countryOfResidence
    : null;
  const arrangements = overseasCountry ? listOverseasArrangements(overseasCountry) : [];

  const actions = [
    { title: t("applyId"), description: "Start a new national ID application", href: "/apply", icon: "ID", enabled: true },
    { title: "Apply from abroad", description: "Overseas registration and documents", href: "/apply?from=abroad", icon: "✈", enabled: true },
    { title: t("myApplications"), description: "Track submitted applications", href: "/applications", icon: "📋", enabled: true },
    { title: t("appointments"), description: "Book or view office appointments", href: "/appointments", icon: "📅", enabled: false },
    { title: t("voiceBridge"), description: "Speak or listen in your language", href: "/voicebridge", icon: "🎙", enabled: false },
    { title: t("wallet"), description: "View officially issued credentials", href: "/wallet", icon: "▣", enabled: false },
    { title: t("community"), description: "Assisted registration and support", href: "/community", icon: "🤝", enabled: false },
    { title: t("diaspora"), description: "Services from abroad", href: "/diaspora", icon: "🌍", enabled: true },
    { title: t("civilRegistration"), description: "Birth, marriage, death and certificates", href: "/services", icon: "📄", enabled: false },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">{t("dashboard")}</p>
          <h1 className="mt-1 text-3xl font-bold">{t("welcome")}, {user.fullName.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {displayPhone(user.phone)}{user.email ? ` · ${user.email}` : ""}
            {overseasCountry ? ` · ${overseasCountry}` : ""}
          </p>
        </div>
        {(user.role === "staff" || user.role === "admin") && (
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" && <Link href="/staff/overseas-arrangements" className="btn-secondary">Manage overseas arrangements</Link>}
            <Link href="/staff" className="btn-secondary">{t("staffPortal")}</Link>
          </div>
        )}
      </div>

      {!user.isVerified && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">{t("unverifiedBanner")}</p>
          <Link href="/verify" className="btn bg-amber-600 text-white hover:bg-amber-700">{t("verify")}</Link>
        </div>
      )}

      {overseasCountry && (
        <section className="card mt-6 border-sky-200 bg-sky-50 p-5">
          <h2 className="text-lg font-bold">Diaspora account</h2>
          <p className="mt-1 text-sm text-sky-900">
            Your country of residence is <strong>{overseasCountry}</strong>. Email verification:{" "}
            <strong>{user.emailVerified ? "complete in this prototype" : "pending"}</strong>.
          </p>
          {arrangements.length === 0 ? (
            <p className="mt-2 text-sm text-sky-900">
              No authorised overseas arrangement is configured. Complete the prototype application and check official
              NCRA channels before making any travel or appointment plans.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-sky-900">
              {arrangements.map((arrangement) => (
                <li key={arrangement.id}>
                  <strong>{arrangement.locationName}:</strong> {arrangement.verificationInstructions}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">{t("services")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="card relative p-5 transition-shadow hover:shadow-md">
              {!action.enabled && (
                <span className="badge absolute right-3 top-3 bg-slate-100 text-ink-500">{t("comingSoon")}</span>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-base font-bold text-brand-700">{action.icon}</div>
              <h3 className="mt-3 pr-16 font-bold">{action.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{t("myApplications")}</h2>
            <Link href="/applications" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          {applications.length === 0 ? (
            <>
              <p className="mt-2 text-sm text-ink-500">{t("noApplications")}</p>
              <Link href="/apply" className="btn-primary mt-4">Start an application</Link>
            </>
          ) : (
            <ul className="mt-4 space-y-4">
              {applications.slice(0, 3).map((application) => {
                const info = STATUS_INFO[application.status];
                const name = applicantsName(application.formData);
                const previewUrl = application.photoStoragePath ? `/api/applications/${application.id}/photo` : "";
                const abroad = isDiaspora(application.formData);
                const date = formatApplicationDate(
                  application.status === "draft" ? application.createdAt : application.submittedAt,
                  timeZoneForApplication(application.formData),
                );
                return (
                  <li key={application.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt={`Passport photograph for ${name}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl text-slate-400" aria-label="No photograph uploaded">▣</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{name}</p>
                        <p className="text-xs text-ink-500">{application.reference}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {application.status === "draft" ? `Started ${date}` : `Submitted ${date}`}
                        </p>
                        {abroad && <p className="mt-0.5 text-xs text-ink-500">{countryOfResidence(application.formData)}</p>}
                      </div>
                      <span className="badge bg-brand-50 text-brand-700">{info.label}</span>
                    </div>
                    <p className="mt-3 text-xs text-ink-500">Next: {info.nextSteps[0]}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Link
                        href={application.status === "draft" ? "/apply" : `/applications/${application.id}`}
                        className="btn-ghost px-0 text-sm"
                      >
                        {application.status === "draft" ? "Continue draft" : "View application"}
                      </Link>
                      {application.status !== "draft" && (
                        <Link href={`/applications/${application.id}/print`} className="btn-ghost px-0 text-sm">Print confirmation</Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold">{t("notifications")}</h2>
          {notifications.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No notifications yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {notifications.slice(0, 5).map((notification) => (
                <li key={notification.id} className="py-3">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{notification.body}</p>
                  <p className="mt-0.5 text-xs text-ink-500">In-app · {formatApplicationDate(notification.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}

          {outbox.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="font-bold">Email and WhatsApp queue</h3>
              <p className="mt-1 text-xs text-amber-800">Prototype only — these messages were queued, not delivered.</p>
              <ul className="mt-3 space-y-2">
                {outbox.slice(0, 5).map((message) => (
                  <li key={message.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="font-semibold uppercase">{message.channel} → {message.recipient}</p>
                    <p className="mt-1 text-ink-500">{message.body}</p>
                    <p className="mt-1 text-ink-500">Status: {message.status.replaceAll("_", " ")}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
