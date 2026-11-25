import Link from "next/link";
import { redirect } from "next/navigation";
import { NationalIdForm } from "@/components/application/national-id-form";
import type { ApplicationLocation } from "@/lib/application-config";
import { getCurrentUser } from "@/lib/auth";
import { findDraftApplication } from "@/lib/db";

type SearchParams = Promise<{ from?: string | string[] | undefined }>;

export default async function ApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const query = await searchParams;
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const defaultLocation: ApplicationLocation = from === "abroad" ? "abroad" : "in_sierra_leone";
  const draft = findDraftApplication(user.id);
  const activeLocation = draft?.formData.applicationLocation === "abroad"
    ? "abroad"
    : draft?.formData.applicationLocation === "in_sierra_leone"
      ? "in_sierra_leone"
      : defaultLocation;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">National ID application</p>
          <h1 className="mt-1 text-3xl font-bold">
            {activeLocation === "abroad" ? "Apply from abroad" : "Apply for a National ID"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            This is a <strong>test application in a prototype</strong>. It is saved locally for demonstration and is not
            submitted to NCRA or used to issue an identity card.
          </p>
          {activeLocation === "abroad" && (
            <p className="mt-2 max-w-2xl text-sm text-sky-900">
              You can complete this prototype from outside Sierra Leone. No official overseas verification, embassy
              appointment or card collection arrangement is claimed here.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={activeLocation === "abroad" ? "/apply?from=sl" : "/apply?from=abroad"} className="btn-secondary">
            {activeLocation === "abroad" ? "Switch to Sierra Leone" : "I live abroad"}
          </Link>
          <Link href="/applications" className="btn-secondary">My applications</Link>
        </div>
      </div>

      <div className="mt-8">
        <NationalIdForm
          userId={user.id}
          initialApplication={draft}
          initialValues={draft?.formData ?? {}}
          hasPhoto={Boolean(draft?.photoDocumentId)}
          fullName={user.fullName}
          phone={user.phone}
          email={user.email}
          defaultLocation={defaultLocation}
          defaultCountry={user.countryOfResidence ?? "Sierra Leone"}
        />
      </div>
    </div>
  );
}
