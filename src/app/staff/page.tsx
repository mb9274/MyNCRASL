import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import { getCurrentUser } from "@/lib/auth";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    return (
      <ComingSoon
        title="Staff & administration portal"
        description="Secure staff login, assigned application queues, document review, information requests, appointment management, status updates, roles, reports and audit logs."
        phase="Feature 4 · Staff portal"
        nextStep="Officer dashboard with application review and controlled status transitions."
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Administration</p>
      <h1 className="mt-1 text-3xl font-bold">Staff and administration portal</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">
        Prototype-only controls. No official NCRA decision or overseas arrangement is created here.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link href="/staff/applications" className="card p-6 transition-shadow hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">📋</div>
          <h2 className="mt-4 text-lg font-bold">Application review</h2>
          <p className="mt-2 text-sm text-ink-500">Change prototype status and record a short next-step note for an applicant.</p>
          <p className="mt-4 text-sm font-semibold text-brand-700">Open →</p>
        </Link>
        <Link href="/staff/overseas-arrangements" className="card p-6 transition-shadow hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">🌍</div>
          <h2 className="mt-4 text-lg font-bold">Overseas arrangements</h2>
          <p className="mt-2 text-sm text-ink-500">Configure only arrangements your organisation has formally authorised.</p>
          <p className="mt-4 text-sm font-semibold text-brand-700">Open →</p>
        </Link>
      </div>
    </div>
  );
}
