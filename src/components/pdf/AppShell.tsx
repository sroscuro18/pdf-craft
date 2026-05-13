import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Languages, FileText } from "lucide-react";
import "@/lib/i18n";

export function AppShell() {
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(false);
  const { location } = useRouterState();

  useEffect(() => {
    const stored = localStorage.getItem("pdf-theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const on = stored ? stored === "dark" : prefers;
    setDark(on);
    document.documentElement.classList.toggle("dark", on);
  }, []);

  useEffect(() => {
    const storedLang = localStorage.getItem("pdf-lang");
    const lang = storedLang || (navigator.language?.startsWith("es") ? "es" : "en");
    if (lang !== i18n.language) i18n.changeLanguage(lang);
  }, [i18n]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("pdf-theme", next ? "dark" : "light");
  };

  const toggleLang = () => {
    const next = i18n.language.startsWith("es") ? "en" : "es";
    i18n.changeLanguage(next);
    localStorage.setItem("pdf-lang", next);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
              <FileText className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>{t("appName")}</span>
          </Link>
          <span className="ml-2 hidden text-xs text-muted-foreground md:inline">{t("tagline")}</span>
          <nav className="ml-auto flex items-center gap-1">
            {location.pathname !== "/" && (
              <Link to="/" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                {t("dashboard")}
              </Link>
            )}
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={t("language")}
            >
              <Languages className="h-4 w-4" />
              <span className="uppercase">{i18n.language.slice(0, 2)}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={t("darkMode")}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-background py-6">
        <div className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground">
          {t("nativeTools")}
        </div>
      </footer>
    </div>
  );
}