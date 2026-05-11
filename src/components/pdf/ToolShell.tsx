import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

export function ToolShell({
  icon,
  title,
  desc,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
          <span className="text-primary-foreground">{icon}</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}