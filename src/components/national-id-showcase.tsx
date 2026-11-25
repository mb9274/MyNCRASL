"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Neutral interactive shell for the National ID card showcase. The official
 * card design has not been supplied yet, so no layout, colours or typography
 * are being reproduced. Swap the two faces when the approved design arrives.
 */
export function NationalIdShowcase() {
  const [side, setSide] = useState<"front" | "back">("front");

  return (
    <section id="national-id" className="bg-white py-14 sm:py-18">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">National ID showcase</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">See the card experience</h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-500">
            This is the interactive space for the proposed National ID card. The final front and back design will be
            added only when the official design is supplied and approved. The sample below is a neutral preview, not an
            issued card.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/apply?from=sl" className="btn-primary">Apply for Your National ID</Link>
            <Link href="/apply?from=abroad" className="btn-secondary">I&apos;m Living Abroad</Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-700">
            Sample preview · Not an official ID · No real citizen information
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="showcase-stage w-full max-w-md">
            <div className="showcase-float">
              <div className={`showcase-card ${side === "back" ? "is-back" : ""}`} aria-label={`Sample card ${side} preview`}>
                <div className="showcase-face showcase-front">
                  <div className="flex items-start justify-between">
                    <span className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold tracking-widest text-white">SAMPLE</span>
                    <span className="text-right text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                      Design pending
                    </span>
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-20 w-16 items-center justify-center rounded-lg border border-dashed border-slate-400 bg-slate-50 text-2xl text-slate-400">
                      ▣
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-40 rounded bg-slate-200" />
                      <div className="h-2 w-28 rounded bg-slate-100" />
                      <div className="h-2 w-20 rounded bg-slate-100" />
                    </div>
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-red-700">Not an official ID</p>
                </div>
                <div className="showcase-face showcase-back">
                  <div className="flex items-start justify-between">
                    <span className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold tracking-widest text-white">SAMPLE</span>
                    <span className="text-right text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                      Back preview pending
                    </span>
                  </div>
                  <div className="mt-8 space-y-3">
                    <div className="h-3 w-full rounded bg-slate-200" />
                    <div className="h-3 w-4/5 rounded bg-slate-100" />
                    <div className="h-3 w-3/5 rounded bg-slate-100" />
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-red-700">
                    Not an official ID · No verification data
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${side === "front" ? "bg-brand-600 text-white" : "bg-slate-200 text-ink-700"}`}
              onClick={() => setSide("front")}
              aria-pressed={side === "front"}
            >
              Front
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${side === "back" ? "bg-brand-600 text-white" : "bg-slate-200 text-ink-700"}`}
              onClick={() => setSide("back")}
              aria-pressed={side === "back"}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-ghost px-3 text-sm"
              onClick={() => setSide((current) => (current === "front" ? "back" : "front"))}
              aria-label="Rotate sample card"
            >
              Rotate ↻
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-ink-500">The approved design will replace this neutral placeholder.</p>
        </div>
      </div>
    </section>
  );
}
