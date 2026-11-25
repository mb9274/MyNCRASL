"use client";

import { useState } from "react";
import { ADMIN_COUNTRY_OPTIONS } from "@/lib/application-config";
import type { OverseasArrangement } from "@/lib/types";

const emptyForm = {
  id: "",
  country: "United Kingdom",
  locationName: "",
  locationType: "Embassy",
  appointmentAvailability: "",
  verificationInstructions: "",
  collectionInstructions: "",
  isActive: true,
};

export function OverseasArrangementsManager({ initialArrangements }: { initialArrangements: OverseasArrangement[] }) {
  const [arrangements, setArrangements] = useState(initialArrangements);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function setField(key: keyof typeof emptyForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function refresh() {
    const response = await fetch("/api/admin/overseas-arrangements");
    if (response.ok) {
      const result = await response.json();
      setArrangements(result.data.arrangements);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/overseas-arrangements", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not save the arrangement.");
      setNotice(form.id ? "Arrangement updated in this prototype." : "Arrangement added in this prototype.");
      setForm(emptyForm);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the arrangement.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/overseas-arrangements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not deactivate the arrangement.");
      setNotice("Arrangement deactivated.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not deactivate the arrangement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="card space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold">{form.id ? "Edit arrangement" : "Add arrangement"}</h2>
          <p className="mt-1 text-sm text-ink-500">
            Enter only details your organisation is formally authorised to publish. Nothing is invented by the system.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="country">Country</label>
            <select className="input" id="country" value={form.country} onChange={(event) => setField("country", event.target.value)}>
              {ADMIN_COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="locationName">Location name</label>
            <input className="input" id="locationName" required minLength={2} value={form.locationName} onChange={(event) => setField("locationName", event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="locationType">Location type</label>
            <input className="input" id="locationType" required minLength={2} value={form.locationType} onChange={(event) => setField("locationType", event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="appointmentAvailability">Appointment availability</label>
            <input className="input" id="appointmentAvailability" required minLength={2} value={form.appointmentAvailability} onChange={(event) => setField("appointmentAvailability", event.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="verificationInstructions">Verification instructions</label>
          <textarea className="input" id="verificationInstructions" rows={3} required minLength={2} value={form.verificationInstructions} onChange={(event) => setField("verificationInstructions", event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="collectionInstructions">Collection or issuance arrangements</label>
          <textarea className="input" id="collectionInstructions" rows={3} required minLength={2} value={form.collectionInstructions} onChange={(event) => setField("collectionInstructions", event.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} />
          Active and visible to applicants
        </label>
        {notice && <p className="rounded-xl bg-slate-50 p-3 text-sm text-ink-700" role="status">{notice}</p>}
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : form.id ? "Update arrangement" : "Add arrangement"}</button>
          {form.id && <button className="btn-ghost" type="button" onClick={() => setForm(emptyForm)}>Cancel edit</button>}
        </div>
      </form>

      <section className="card p-6">
        <h2 className="text-xl font-bold">Configured arrangements</h2>
        {arrangements.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No arrangements have been configured. This is the safe default.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {arrangements.map((arrangement) => (
              <li key={arrangement.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{arrangement.country}</p>
                    <p className="font-bold">{arrangement.locationName}</p>
                    <p className="text-xs text-ink-500">{arrangement.isActive ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost px-2 text-sm"
                      onClick={() => setForm({
                        id: arrangement.id,
                        country: arrangement.country,
                        locationName: arrangement.locationName,
                        locationType: arrangement.locationType,
                        appointmentAvailability: arrangement.appointmentAvailability,
                        verificationInstructions: arrangement.verificationInstructions,
                        collectionInstructions: arrangement.collectionInstructions,
                        isActive: arrangement.isActive,
                      })}
                    >
                      Edit
                    </button>
                    {arrangement.isActive && (
                      <button type="button" className="btn-ghost px-2 text-sm text-red-700" disabled={busy} onClick={() => void deactivate(arrangement.id)}>
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
