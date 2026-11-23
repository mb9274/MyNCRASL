import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Accessibility</h1>
      <p className="mt-3 text-ink-500">
        MyNCRA is designed so that nobody is excluded because of literacy, language, disability, age or connectivity.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ["Voice-first", "Speak and listen instead of reading. VoiceBridge supports local languages."],
          ["Large, clear controls", "High contrast, large touch targets and simple wording."],
          ["Screen-reader friendly", "Semantic structure, labels and visible focus indicators."],
          ["Assisted access", "Community assistants help citizens who cannot use a smartphone."],
          ["Low connectivity", "Lightweight pages and planned USSD/SMS access for basic services."],
          ["Human escalation", "Uncertain translations are flagged and can be handed to a person."],
        ].map(([title, body]) => (
          <div key={title} className="card p-5">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-1 text-sm text-ink-500">{body}</p>
          </div>
        ))}
      </div>
      <Link href="/" className="btn-secondary mt-8">Back home</Link>
    </div>
  );
}
