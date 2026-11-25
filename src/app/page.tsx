import Link from "next/link";
import { NationalIdShowcase } from "@/components/national-id-showcase";
import { getCurrentUser, getLanguagePreference } from "@/lib/auth";
import { translate } from "@/lib/i18n";

const modules = [
  { title: "Digital ID", description: "Apply in Sierra Leone or from abroad, upload documents and follow every step.", icon: "ID", href: "/apply" },
  { title: "VoiceBridge", description: "Speak in Krio, Mende, Temne, Limba and more. Voice guidance and translation with human escalation.", icon: "🎙", href: "/voicebridge" },
  { title: "Community Connect", description: "Authorised assistants and community centres help people who cannot easily use a smartphone.", icon: "🤝", href: "/community" },
  { title: "Diaspora", description: "Register from abroad, track progress and view configured overseas instructions.", icon: "🌍", href: "/diaspora" },
  { title: "Digital Wallet", description: "View officially issued credentials and generate a secure verification QR code.", icon: "▣", href: "/wallet" },
  { title: "Civil Registration", description: "Birth, death and marriage registration and certificate requests, each with its own workflow.", icon: "📄", href: "/services" },
  { title: "Staff Portal", description: "Secure tools for NCRA officers to review applications, documents and status changes.", icon: "⚙", href: "/staff" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const lang = await getLanguagePreference();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-100">
              Proposed platform · Concept prototype
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Identity services that reach <span className="text-gold-500">everyone</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-200">{t("tagline")}</p>
            <p className="mt-4 max-w-2xl text-base text-slate-300">
              MyNCRA brings national ID and civil registration services online — with voice support in Sierra Leonean
              languages, assisted access for rural communities, and secure tools for NCRA staff.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/dashboard" : "/register"} className="btn bg-gold-500 px-6 text-ink-950 hover:bg-amber-400">
                {user ? t("dashboard") : t("createAccount")}
              </Link>
              <Link href="/voicebridge" className="btn border border-white/30 text-white hover:bg-white/10">
                Try VoiceBridge
              </Link>
            </div>
          </div>
          <div className="card border-white/10 bg-white/5 p-6 text-white backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-widest text-gold-500">Built around real barriers</p>
            <ul className="mt-5 space-y-4">
              {[
                ["Long queues", "Start and track applications from home"],
                ["Language barriers", "Voice support in local languages"],
                ["Low literacy", "Listen, speak and confirm — no reading required"],
                ["Living abroad", "Approved overseas workflows and guidance"],
              ].map(([problem, solution]) => (
                <li key={problem} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <p className="font-semibold text-red-200">{problem}</p>
                  <p className="mt-0.5 text-sm text-slate-200">{solution}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
        <strong>Demo notice:</strong> {t("demoNotice")}
      </div>

      <NationalIdShowcase />

      <section id="services" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold">One platform, seven modules</h2>
        <p className="mt-2 max-w-2xl text-ink-500">
          Each module follows the phased roadmap in the PRD. Features are being enabled one at a time.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.title} href={module.href} className="card group p-6 transition-shadow hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">
                {module.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{module.description}</p>
              <p className="mt-4 text-sm font-semibold text-brand-700 group-hover:underline">Explore →</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="about" className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Our principle</p>
            <h2 className="mt-3 text-3xl font-bold">Every Sierra Leonean, everywhere.</h2>
            <p className="mt-4 leading-relaxed text-ink-500">
              Educated or not, in Freetown or a rural village, in Sierra Leone or abroad — everyone should be able to
              access NCRA services. The platform combines digital ID services, AI-powered local-language communication,
              community assistance and secure digital credentials.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Accessible", "Large controls, clear language, screen-reader friendly"],
              ["Voice-first", "Speak instead of type; hear responses in your language"],
              ["Secure by design", "Encrypted storage, role-based access, audit logs"],
              ["Human oversight", "AI assists; NCRA officers make official decisions"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
