import Link from "next/link";
import { redirect } from "next/navigation";
import { OverseasArrangementsManager } from "@/components/admin/overseas-arrangements-manager";
import { getCurrentUser } from "@/lib/auth";
import { listAllOverseasArrangements } from "@/lib/db";

export default async function StaffOverseasArrangementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/staff");

  const arrangements = listAllOverseasArrangements();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/staff" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to staff portal
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Administration</p>
        <h1 className="mt-1 text-3xl font-bold">Overseas arrangements</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-500">
          Add only information your organisation is formally authorised to publish. This prototype ships with no
          arrangements, and no embassy, consulate or appointment location is invented by the system.
        </p>
      </div>
      <div className="mt-8">
        <OverseasArrangementsManager initialArrangements={arrangements} />
      </div>
    </div>
  );
}
