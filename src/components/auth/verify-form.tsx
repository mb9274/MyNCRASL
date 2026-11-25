"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function readStoredDemoCode(): string {
  if (typeof window === "undefined") return "";
  const stored = sessionStorage.getItem("myncra_demo_code") ?? "";
  if (stored) sessionStorage.removeItem("myncra_demo_code");
  return stored;
}

export function VerifyForm({ destination }: { destination: string }) {
  const router = useRouter();
  const [storedCode] = useState(readStoredDemoCode);
  const [code, setCode] = useState(storedCode);
  const [demoCode, setDemoCode] = useState(storedCode);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(endpoint: "/api/auth/verify" | "/api/auth/resend-code") {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: endpoint.endsWith("verify") ? JSON.stringify({ code }) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Request failed.");
      if (endpoint.endsWith("verify")) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage(result.data.message);
        if (result.data.demoVerificationCode) {
          setDemoCode(result.data.demoVerificationCode);
          setCode(result.data.demoVerificationCode);
        }
        setPending(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); void submit("/api/auth/verify"); }}
      className="card space-y-5 p-6 sm:p-8"
    >
      <div>
        <h1 className="text-2xl font-bold">Verify your account</h1>
        <p className="mt-1 text-sm text-ink-500">
          In this prototype, the 6-digit demo code is shown below. A real deployment would send it to{" "}
          <span className="font-semibold">{destination}</span>.
        </p>
      </div>

      {demoCode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Demo code: {demoCode}</p>
          <p className="mt-1 text-xs">No SMS gateway is connected in this prototype, so the code is displayed here.</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="code">Verification code</label>
        <input
          className="input text-center text-2xl tracking-[0.5em]"
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">{message}</p>}

      <button className="btn-primary w-full" type="submit" disabled={pending || code.length !== 6}>
        {pending ? "Verifying…" : "Verify account"}
      </button>
      <button className="btn-ghost w-full" type="button" disabled={pending} onClick={() => void submit("/api/auth/resend-code")}>
        Send a new code
      </button>
      <p className="text-center text-sm">
        <Link href="/dashboard" className="font-semibold text-brand-700 hover:underline">Skip for now</Link>
      </p>
    </form>
  );
}
