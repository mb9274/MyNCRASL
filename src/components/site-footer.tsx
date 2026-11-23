import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-bold text-ink-900">MyNCRA</p>
          <p className="mt-2 text-sm text-ink-500">One platform. Every Sierra Leonean. Everywhere.</p>
        </div>
        <div className="text-sm text-ink-700">
          <p className="font-semibold">Explore</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link href="/#services" className="hover:text-brand-700">Services</Link>
            <Link href="/voicebridge" className="hover:text-brand-700">VoiceBridge</Link>
            <Link href="/accessibility" className="hover:text-brand-700">Accessibility</Link>
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Demonstration build</p>
          <p className="mt-1">
            Proposed concept only. Not affiliated with or approved by NCRA. No real identity data is processed.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} MyNCRA concept prototype
      </div>
    </footer>
  );
}
