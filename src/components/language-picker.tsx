"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LANGUAGE_META, translate } from "@/lib/i18n";
import { LANGUAGES, type Language } from "@/lib/types";

interface Props {
  current: Language;
  compact?: boolean;
  onSelect?: (language: Language) => void;
  label?: string;
}

export function LanguagePicker({ current, compact = false, onSelect, label }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<Language>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleChange(next: Language) {
    setValue(next);
    setError("");
    if (onSelect) {
      onSelect(next);
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/preferences/language", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: next }),
        });
        if (!response.ok) throw new Error("Failed");
        router.refresh();
      } catch {
        setError(translate(next, "somethingWrong"));
      }
    });
  }

  return (
    <div className={compact ? "" : "w-full"}>
      {label && <label className="label" htmlFor="language-picker">{label}</label>}
      <select
        id="language-picker"
        className={compact ? "min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium" : "input"}
        value={value}
        disabled={pending}
        onChange={(event) => handleChange(event.target.value as Language)}
        aria-label={translate(current, "selectLanguage")}
      >
        {LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {LANGUAGE_META[language].nativeName} — {LANGUAGE_META[language].name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
