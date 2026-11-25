import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatusManager } from "@/components/admin/application-status-manager";
import { getCurrentUser } from "@/lib/auth";
import { listAllApplications } from "@/lib/db";

export default async function StaffApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/staff");

  const applications = listAllApplications().filter((application) => application.status !== "draft");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/staff" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to staff portal
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Administration</p>
        <h1 className="mt-1 text-3xl font-bold">Application review</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-500">
          Prototype-only status controls. A status note creates an in-app notification and an audit entry, but it is not
          an official NCRA decision and no external email, SMS or WhatsApp message is delivered.
        </p>
      </div>
      <div className="mt-8">
        <ApplicationStatusManager initialApplications={applications} />
      </div>
    </div>
  );
}
