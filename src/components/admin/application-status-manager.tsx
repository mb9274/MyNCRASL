"use client";

import { useState } from "react";
import { STATUS_INFO } from "@/lib/application-config";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from "@/lib/types";

export function ApplicationStatusManager({ initialApplications }: { initialApplications: Application[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [selectedId, setSelectedId] = useState(initialApplications[0]?.id ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(initialApplications[0]?.status ?? "submitted");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const selected = applications.find((application) => application.id === selectedId) ?? applications[0] ?? null;

  function chooseApplication(id: string) {
    const application = applications.find((entry) => entry.id === id);
    setSelectedId(id);
    setStatus(application?.status ?? "submitted");
    setNote("");
    setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not update the prototype status.");
      const updated = result.data.application as Application;
      setApplications((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setNotice("Prototype status updated. The applicant has been notified in the prototype inbox.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the prototype status.");
    } finally {
      setBusy(false);
    }
  }

  if (applications.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-sm text-ink-500">No prototype applications have been submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-xl font-bold">Submitted applications</h2>
        <p className="mt-1 text-sm text-ink-500">
          Select a record to record a prototype status note. Decisions shown here are not official NCRA decisions.
        </p>
        <ul className="mt-5 space-y-2">
          {applications.map((application) => {
            const name = typeof application.formData.fullName === "string" ? application.formData.fullName : "Applicant";
            const active = selected?.id === application.id;
            return (
              <li key={application.id}>
                <button
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${active ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-500"}`}
                  onClick={() => chooseApplication(application.id)}
                  aria-pressed={active}
                >
                  <span className="block font-bold">{name}</span>
                  <span className="mt-0.5 block break-all text-xs text-ink-500">{application.reference}</span>
                  <span className="mt-1 block text-xs text-ink-500">{STATUS_INFO[application.status].label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <form onSubmit={save} className="card space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold">Record prototype status</h2>
          <p className="mt-1 text-sm text-ink-500">
            Reference: <span className="font-semibold text-ink-900">{selected?.reference}</span>
          </p>
        </div>
        <div>
          <label className="label" htmlFor="application-status">Status</label>
          <select
            className="input"
            id="application-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
          >
            {APPLICATION_STATUSES.map((option) => (
              <option key={option} value={option}>{STATUS_INFO[option].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status-note">Next-step note for the applicant</label>
          <textarea
            className="input"
            id="status-note"
            rows={4}
            required
            minLength={2}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. In this prototype, upload a clearer supporting document."
          />
        </div>
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-ink-500">
          This creates a prototype status event and an in-app notification. It does not send an external message or
          change an official record.
        </p>
        {notice && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800" role="status">{notice}</p>}
        <button className="btn-primary" type="submit" disabled={busy || !selected}>
          {busy ? "Saving…" : "Save prototype status"}
        </button>
      </form>
    </div>
  );
}
