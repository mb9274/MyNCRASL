import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] | undefined }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const query = await searchParams;
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <RegisterForm defaultMode={from === "abroad" ? "abroad" : "in_sierra_leone"} />
    </div>
  );
}
