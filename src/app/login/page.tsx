import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "staff" || user.role === "admin" ? "/staff" : "/dashboard");
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <LoginForm />
    </div>
  );
}
