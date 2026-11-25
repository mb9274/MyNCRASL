"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * Interactive front/back showcase using the artwork supplied for this
 * prototype. The overlay keeps the display clearly non-official; it does not
 * claim that a card has been issued or that any data shown is real.
 */
const CARD_FACES = [
  {
    side: "front",
    src: "/cards/national-id-front.png",
    alt: "Supplied National ID card front design",
  },
  {
    side: "back",
    src: "/cards/national-id-back.png",
    alt: "Supplied National ID card back design",
  },
] as const;

export function NationalIdShowcase() {
  const [side, setSide] = useState<"front" | "back">("front");

  return (
    <section id="national-id" className="bg-white py-14 sm:py-18">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold-600">National ID showcase</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Card front and back</h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-500">
            The supplied card artwork is shown below. It is part of this concept prototype and is not an issued
            identity card. Use the controls to rotate between the two faces.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/apply?from=sl" className="btn-primary">Apply for Your National ID</Link>
            <Link href="/apply?from=abroad" className="btn-secondary">I&apos;m Living Abroad</Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-700">
            Prototype preview · Not an official ID · No real citizen information
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="showcase-stage w-full max-w-md">
            <div className="showcase-float">
              <div className={`showcase-card ${side === "back" ? "is-back" : ""}`} aria-label={`Supplied card ${side} preview`}>
                {CARD_FACES.map((face) => (
                  <div
                    key={face.side}
                    className={`showcase-face showcase-image-face showcase-${face.side}`}
                    aria-hidden={side !== face.side}
                  >
                    <Image
                      src={face.src}
                      alt={face.alt}
                      fill
                      sizes="(max-width: 1024px) 90vw, 420px"
                      className="showcase-image"
                      priority={face.side === "front"}
                    />
                    <span className="showcase-preview-badge">Prototype preview · Not an official ID</span>
                  </div>
                ))}
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
              aria-label="Rotate card preview"
            >
              Rotate ↻
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-ink-500">
            Use Front, Back or Rotate to inspect the supplied artwork.
          </p>
        </div>
      </div>
    </section>
  );
}
