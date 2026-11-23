import Link from "next/link";
import { getCurrentUser, getLanguagePreference } from "@/lib/auth";
import { translate } from "@/lib/i18n";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const lang = await getLanguagePreference();
  const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-ink-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white">MC</span>
          <span className="text-lg tracking-tight">MyNCRA</span>
        </Link>
        <nav className="ml-2 hidden items-center gap-5 text-sm font-medium text-ink-700 md:flex">
          <Link href="/" className="hover:text-brand-700">{t("home")}</Link>
          <Link href="/#services" className="hover:text-brand-700">{t("services")}</Link>
          <Link href="/#about" className="hover:text-brand-700">{t("about")}</Link>
          {user && <Link href="/dashboard" className="hover:text-brand-700">{t("dashboard")}</Link>}
          {(user?.role === "staff" || user?.role === "admin") && (
            <Link href="/staff" className="hover:text-brand-700">{t("staffPortal")}</Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <form action="/api/auth/logout" method="post">
              <button className="btn-ghost" type="submit">{t("signOut")}</button>
            </form>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">{t("signIn")}</Link>
              <Link href="/register" className="btn-primary">{t("createAccount")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
