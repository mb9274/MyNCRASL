"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: form.get("identifier"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Sign in failed.");
      router.push(result.data.user.role === "staff" || result.data.user.role === "admin" ? "/staff" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-500">Sign in with your phone number or email address.</p>
      </div>
      <div>
        <label className="label" htmlFor="identifier">Phone number or email</label>
        <input className="input" id="identifier" name="identifier" autoComplete="username" required placeholder="076 123 456 or you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button className="btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-500">
        New to MyNCRA? <Link href="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
