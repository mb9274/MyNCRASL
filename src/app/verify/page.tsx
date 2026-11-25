import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/verify-form";
import { getCurrentUser } from "@/lib/auth";
import { displayPhone } from "@/lib/validation";


export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isVerified) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <VerifyForm destination={user.email ? `${user.email} / ${displayPhone(user.phone)}` : displayPhone(user.phone)} />
    </div>
  );
}
