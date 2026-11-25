"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COUNTRIES, dialCodeForCountry } from "@/lib/countries";

type RegistrationMode = "in_sierra_leone" | "abroad";

export function RegisterForm({ defaultMode = "in_sierra_leone" }: { defaultMode?: RegistrationMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<RegistrationMode>(defaultMode);
  const [country, setCountry] = useState(defaultMode === "abroad" ? "United Kingdom" : "Sierra Leone");
  const [dialCode, setDialCode] = useState(defaultMode === "abroad" ? "+44" : "+232");
  const [role, setRole] = useState<"citizen" | "assistant">("citizen");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const phone = mode === "abroad"
      ? `${dialCode}${(form.get("nationalNumber") ?? "").toString()}`
      : form.get("phone");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone,
          countryOfResidence: mode === "abroad" ? country : "Sierra Leone",
          registrationRoute: mode,
          email: form.get("email"),
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
          preferredLanguage: "en",
          role,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Registration failed.");
      if (result.data.demoVerificationCode) {
        sessionStorage.setItem("myncra_demo_code", result.data.demoVerificationCode);
      }
      router.push("/verify");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-ink-500">
          {mode === "abroad"
            ? "For Sierra Leoneans living outside Sierra Leone. It takes about two minutes."
            : "It takes about two minutes."}
        </p>
      </div>

      <fieldset>
        <legend className="label">I am registering from</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "in_sierra_leone", label: "Sierra Leone", hint: "Use a Sierra Leone phone number" },
            { value: "abroad", label: "Outside Sierra Leone", hint: "Use your current country and phone code" },
          ].map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border p-4 ${mode === option.value ? "border-brand-600 bg-brand-50" : "border-slate-300"}`}
            >
              <input
                type="radio"
                name="registrationMode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => {
                  const next = option.value as RegistrationMode;
                  setMode(next);
                  if (next === "abroad" && country === "Sierra Leone") {
                    setCountry("United Kingdom");
                    setDialCode("+44");
                  }
                  if (next === "in_sierra_leone") {
                    setCountry("Sierra Leone");
                    setDialCode("+232");
                  }
                }}
                className="mr-2 accent-brand-600"
              />
              <span className="font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs text-ink-500">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="fullName">Full name</label>
        <input className="input" id="fullName" name="fullName" autoComplete="name" required minLength={2} placeholder="e.g. Aminata Sesay" />
      </div>

      {mode === "abroad" && (
        <div>
          <label className="label" htmlFor="country">Country of residence</label>
          <select
            className="input"
            id="country"
            name="country"
            required
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setDialCode(dialCodeForCountry(event.target.value));
            }}
          >
            {COUNTRIES.filter((entry) => entry.value !== "Sierra Leone").map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-500">This is separate from your nationality and country of birth.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "abroad" ? (
          <>
            <div>
              <label className="label" htmlFor="dialCode">Phone country code</label>
              <input
                className="input"
                id="dialCode"
                value={dialCode}
                onChange={(event) => setDialCode(event.target.value)}
                required
                placeholder="+44"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="label" htmlFor="nationalNumber">Phone number</label>
              <input
                className="input"
                id="nationalNumber"
                name="nationalNumber"
                type="tel"
                autoComplete="tel-national"
                required
                placeholder="7700 900123"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="label" htmlFor="phone">Sierra Leone phone number</label>
            <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="076 123 456" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email address {mode === "abroad" ? <span className="text-red-700">*</span> : <span className="font-normal text-ink-500">(optional)</span>}
          </label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required={mode === "abroad"}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirm password</label>
          <input className="input" id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        </div>
      </div>

      <fieldset>
        <legend className="label">I am registering as</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "citizen", label: "Citizen", hint: "Apply for and manage my own services" },
            { value: "assistant", label: "Community assistant", hint: "Help others with their applications" },
          ].map((option) => (
            <label key={option.value} className={`cursor-pointer rounded-xl border p-4 ${role === option.value ? "border-brand-600 bg-brand-50" : "border-slate-300"}`}>
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value as "citizen" | "assistant")}
                className="mr-2 accent-brand-600"
              />
              <span className="font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs text-ink-500">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="rounded-xl bg-slate-50 p-3 text-xs text-ink-500">
        Community assistant accounts require NCRA approval before they can assist applicants. In this demo, no approval
        workflow is active. {mode === "abroad" && "The prototype verification code is shown on the next screen because no email or WhatsApp gateway is connected."}
      </p>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      <button className="btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-500">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
