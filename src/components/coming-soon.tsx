import Link from "next/link";

interface Props {
  title: string;
  description: string;
  phase: string;
  nextStep?: string;
}

export function ComingSoon({ title, description, phase, nextStep }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">🛠</div>
        <span className="badge mt-5 bg-brand-50 text-brand-700">{phase}</span>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-ink-500">{description}</p>
        {nextStep && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-ink-500">
            <strong>Next build step:</strong> {nextStep}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
          <Link href="/" className="btn-primary">Back home</Link>
        </div>
      </div>
    </div>
  );
}
