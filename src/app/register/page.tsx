import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser, getLanguagePreference } from "@/lib/auth";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const language = await getLanguagePreference();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <RegisterForm initialLanguage={language} />
    </div>
  );
}
