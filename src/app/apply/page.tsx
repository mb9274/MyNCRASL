import Link from "next/link";
import { redirect } from "next/navigation";
import { NationalIdForm } from "@/components/application/national-id-form";
import { getCurrentUser } from "@/lib/auth";
import { findDraftApplication } from "@/lib/db";

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const draft = findDraftApplication(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">National ID application</p>
          <h1 className="mt-1 text-3xl font-bold">Apply for a National ID</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            This is a <strong>test application in a prototype</strong>. It is saved locally for demonstration and is not
            submitted to NCRA or used to issue an identity card.
          </p>
        </div>
        <Link href="/applications" className="btn-secondary">My applications</Link>
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
        />
      </div>
    </div>
  );
}
