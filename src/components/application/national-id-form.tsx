"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ADDRESS_FIELDS,
  PERSONAL_FIELDS,
  STATUS_INFO,
  type ApplicationField,
} from "@/lib/application-config";
import type { Application } from "@/lib/types";
import { displayPhone, normalizeSierraLeonePhone } from "@/lib/validation";

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];

interface Props {
  userId: string;
  initialApplication: Application | null;
  initialValues: Record<string, unknown>;
  hasPhoto: boolean;
  fullName: string;
  phone: string;
  email: string | null;
}

interface PhotoState {
  uploaded: boolean;
  name: string;
  size: number;
  version: number;
}

const STEPS = ["Applicant details", "Address and contact", "Photograph and review"];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function NationalIdForm({ userId, initialApplication, initialValues, hasPhoto, fullName, phone, email }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const draftKey = `myncra_draft_${userId}`;
  const storedKey = `myncra_draft_values_${userId}`;

  const [applicationId, setApplicationId] = useState<string | null>(initialApplication?.id ?? null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    fullName,
    phone: displayPhone(phone),
    email: email ?? "",
    nationality: "Sierra Leonean",
    preferredContactMethod: "SMS",
    consent: false,
    ...initialValues,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<PhotoState>({
    uploaded: hasPhoto,
    name: asString(initialApplication?.photoOriginalName),
    size: initialApplication?.photoSizeBytes ?? 0,
    version: 0,
  });
  const [busy, setBusy] = useState<"" | "saving" | "uploading" | "submitting" | "removing">("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || initialApplication?.submittedAt) return;
      try {
        const saved = localStorage.getItem(storedKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, unknown>;
          setValues((current) => ({ ...current, ...parsed }));
        }
      } catch {
        // A corrupted browser draft must never block the form.
      }
    });
    return () => { active = false; };
    // Restore once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storedKey, JSON.stringify(values));
    } catch {
      // ignore storage restrictions
    }
  }, [values, storedKey]);

  const value = (key: string) => asString(values[key]);
  const setField = (key: string, next: string | boolean) => {
    setValues((current) => ({ ...current, [key]: next }));
    setErrors((current) => {
      if (!current[key]) return current;
      const copy = { ...current };
      delete copy[key];
      return copy;
    });
    setNotice("");
  };

  async function persistDraft(showBusy = true): Promise<string | null> {
    if (showBusy) setBusy("saving");
    try {
      const response = await fetch("/api/applications/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, formData: values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Your draft could not be saved.");
      const id = String(result.data.application.id);
      setApplicationId(id);
      localStorage.setItem(draftKey, id);
      return id;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your draft could not be saved.");
      return null;
    } finally {
      if (showBusy) setBusy("");
    }
  }

  function validateVisibleStep(): boolean {
    const found: Record<string, string> = {};
    const fields = step === 0 ? PERSONAL_FIELDS : ADDRESS_FIELDS;
    for (const field of fields) {
      if (!field.required) continue;
      if (!value(field.key).trim()) found[field.key] = `${field.label} is required.`;
    }
    if (step === 0 && value("nationality") === "Other" && !value("nationalityOther").trim()) {
      found.nationalityOther = "Please specify your nationality.";
    }
    if (step === 1 && value("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) {
      found.email = "Enter a valid email address or leave it blank.";
    }
    if (step === 1 && value("phone").trim() && !normalizeSierraLeonePhone(value("phone"))) {
      found.phone = "Enter a valid Sierra Leone phone number, e.g. 076 123 456.";
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function goNext() {
    if (!validateVisibleStep()) return;
    const id = await persistDraft();
    if (!id) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setErrors({});
    setNotice("");
    if (!ALLOWED.includes(file.type)) {
      setErrors({ photo: "Only JPEG, JPG or PNG photographs are accepted." });
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setErrors({ photo: "The photograph must be 5 MB or smaller." });
      return;
    }
    let id = applicationId;
    if (!id) {
      id = await persistDraft(false);
      if (!id) return;
    }
    setBusy("uploading");
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch(`/api/applications/${id}/photo`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) {
        const detail = typeof result.error?.details === "string" ? result.error.details : null;
        throw new Error(result.error?.message || detail || "The photograph could not be uploaded.");
      }
      setPhoto((current) => ({
        uploaded: true,
        name: result.data.photo.originalName,
        size: result.data.photo.sizeBytes,
        version: current.version + 1,
      }));
    } catch (error) {
      setErrors({ photo: error instanceof Error ? error.message : "The photograph could not be uploaded." });
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removePhoto() {
    if (!applicationId) return;
    setBusy("removing");
    try {
      const response = await fetch(`/api/applications/${applicationId}/photo`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "The photograph could not be removed.");
      setPhoto((current) => ({ uploaded: false, name: "", size: 0, version: current.version + 1 }));
      setNotice("Photograph removed. Choose a new one before submitting.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The photograph could not be removed.");
    } finally {
      setBusy("");
    }
  }

  async function submitApplication() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy("submitting");
    setErrors({});
    setNotice("");
    try {
      const id = await persistDraft(false);
      if (!id) return;
      if (!photo.uploaded) {
        setErrors({ photo: "Upload a passport photograph before submitting." });
        setStep(2);
        return;
      }
      const response = await fetch(`/api/applications/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: values }),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = result.error?.details;
        const fieldErrors: Record<string, string> = {};
        if (details && typeof details === "object" && !Array.isArray(details)) {
          for (const [key, message] of Object.entries(details)) fieldErrors[key] = String(message);
        }
        setErrors(fieldErrors);
        throw new Error(result.error?.message || "The application could not be submitted. Please try again.");
      }
      setSubmitted(result.data.application);
      localStorage.removeItem(storedKey);
      localStorage.removeItem(draftKey);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The application could not be submitted. Please try again.");
    } finally {
      setBusy("");
      submittingRef.current = false;
    }
  }

  if (submitted) {
    const info = STATUS_INFO[submitted.status];
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Test application submitted</h1>
        <p className="mt-2 text-ink-500">
          Your proposed application was saved in this prototype. It has <strong>not</strong> been sent to NCRA.
        </p>
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Application reference number</p>
          <p className="mt-1 break-all text-2xl font-bold text-brand-700">{submitted.reference}</p>
          <p className="mt-2 text-sm text-ink-500">Keep this number to find your application later.</p>
        </div>
        <p className="mt-4 text-sm font-semibold">Status: {info.label}</p>
        <p className="mt-1 text-sm text-ink-500">{info.description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/applications/${submitted.id}`} className="btn-primary">View application</Link>
          <Link href="/dashboard" className="btn-secondary">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  function renderField(field: ApplicationField) {
    if (field.key === "nationalityOther" && value("nationality") !== "Other") return null;
    const error = errors[field.key];
    const id = `field-${field.key}`;
    const common = {
      id,
      name: field.key,
      value: value(field.key),
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setField(field.key, event.target.value),
      "aria-invalid": Boolean(error),
      "aria-describedby": error ? `${id}-error` : undefined,
      className: `input ${error ? "border-red-500" : ""}`,
    };
    return (
      <div key={field.key} className={field.key === "nationalityOther" ? "sm:col-span-2" : ""}>
        <label className="label" htmlFor={id}>
          {field.label}
          {field.required ? <span className="text-red-700"> *</span> : <span className="font-normal text-ink-500"> (optional)</span>}
        </label>
        {field.type === "select" ? (
          <select {...common}>
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <textarea {...common} rows={3} placeholder={field.placeholder} />
        ) : (
          <input
            {...common}
            type={field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
            placeholder={field.placeholder}
            autoComplete={field.autocomplete}
            max={field.type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
          />
        )}
        {field.hint && !error && <p className="mt-1 text-xs text-ink-500">{field.hint}</p>}
        {field.unconfirmed && !error && (
          <p className="mt-1 text-xs text-amber-700">Official requirement to be confirmed by NCRA.</p>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-700" id={`${id}-error`} role="alert">{error}</p>
        )}
      </div>
    );
  }

  const photoPreviewUrl = photo.uploaded && applicationId ? `/api/applications/${applicationId}/photo?v=${photo.version}` : "";

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); }}
      className="space-y-6"
      noValidate
    >
      <div className="card p-5 sm:p-7">
        <ol className="flex flex-wrap gap-2" aria-label="Application steps">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  index === step ? "bg-brand-600 text-white" : index < step ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-ink-500"
                }`}
                aria-current={index === step ? "step" : undefined}
              >
                {index < step ? "✓" : index + 1}
              </span>
              <span className={`text-sm font-semibold ${index === step ? "text-ink-900" : "text-ink-500"}`}>{label}</span>
              {index < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-slate-300 sm:block" />}
            </li>
          ))}
        </ol>
      </div>

      {notice && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{notice}</div>
      )}

      {step === 0 && (
        <section className="card p-5 sm:p-7">
          <h2 className="text-xl font-bold">Applicant details</h2>
          <p className="mt-1 text-sm text-ink-500">Fields marked * are required. You can change anything before submitting.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">{PERSONAL_FIELDS.map(renderField)}</div>
        </section>
      )}

      {step === 1 && (
        <section className="card p-5 sm:p-7">
          <h2 className="text-xl font-bold">Address and contact</h2>
          <p className="mt-1 text-sm text-ink-500">Tell us where you live and how we may contact you in this prototype.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">{ADDRESS_FIELDS.map(renderField)}</div>
        </section>
      )}

      {step === 2 && (
        <section className="card space-y-6 p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-bold">Passport photograph</h2>
            <p className="mt-1 text-sm text-ink-500">JPEG, JPG or PNG, up to 5 MB. You can remove and replace it.</p>
            <input
              ref={fileInput}
              id="photo-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="sr-only"
              onChange={(event) => void pickFile(event.target.files?.[0])}
            />
            <div className="mt-4 flex flex-wrap items-start gap-5">
              <div className="flex h-40 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
                {photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreviewUrl} alt="Passport photograph preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl text-slate-400">▣</span>
                )}
              </div>
              <div className="space-y-3">
                <button type="button" className="btn-primary" disabled={busy === "uploading"} onClick={() => fileInput.current?.click()}>
                  {busy === "uploading" ? "Uploading…" : photo.uploaded ? "Replace photograph" : "Choose photograph"}
                </button>
                {photo.uploaded && (
                  <button type="button" className="btn-secondary" disabled={busy === "removing"} onClick={() => void removePhoto()}>
                    {busy === "removing" ? "Removing…" : "Remove photograph"}
                  </button>
                )}
                {photo.uploaded && (
                  <p className="text-sm text-ink-500">{photo.name} · {(photo.size / 1024).toFixed(0)} KB</p>
                )}
                {errors.photo && <p className="text-sm text-red-700" role="alert">{errors.photo}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold">Review your information</h3>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[...PERSONAL_FIELDS, ...ADDRESS_FIELDS].filter((f) => value(f.key) && f.key !== "consent").map((field) => (
                <div key={field.key}>
                  <dt className="text-ink-500">{field.label}</dt>
                  <dd className="font-semibold">{value(field.key)}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="btn-ghost mt-4 px-0" onClick={() => setStep(0)}>Edit applicant details</button>
            <button type="button" className="btn-ghost ml-4 mt-4 px-0" onClick={() => setStep(1)}>Edit address</button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <label className="flex items-start gap-3 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={Boolean(values.consent)}
                onChange={(event) => setField("consent", event.target.checked)}
                className="mt-1 h-5 w-5 accent-brand-600"
                aria-invalid={Boolean(errors.consent)}
              />
              <span>
                I confirm that the information above is correct to the best of my knowledge. I understand this is a
                <strong> test application in a prototype</strong> and it will not be sent to NCRA or used to issue an ID card.
              </span>
            </label>
            {errors.consent && <p className="mt-2 text-sm text-red-700" role="alert">{errors.consent}</p>}
          </div>
        </section>
      )}

      {Object.keys(errors).length > 0 && step < 2 && (
        <p className="text-sm text-red-700" role="alert">Please correct the highlighted fields before continuing.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {step > 0 && (
            <button type="button" className="btn-secondary" onClick={goBack} disabled={busy !== ""}>Back</button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {step < 2 ? (
            <button type="button" className="btn-primary" onClick={() => void goNext()} disabled={busy !== ""}>
              {busy === "saving" ? "Saving…" : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void submitApplication()}
              disabled={busy !== "" || !photo.uploaded}
            >
              {busy === "submitting" ? "Submitting…" : "SUBMIT ID APPLICATION"}
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-ink-500">
        Your information is saved as a draft while you work. Nothing is sent to NCRA in this development version.
      </p>
    </form>
  );
}
