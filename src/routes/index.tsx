import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TOOLS } from "@/components/pdf/tools";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const categories = ["organize", "optimize", "edit", "convert"] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="relative overflow-hidden rounded-3xl border border-border p-10 shadow-[var(--shadow-card)]" style={{ background: "var(--gradient-surface)" }}>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <h1 className="relative text-4xl font-semibold tracking-tight md:text-5xl">{t("appName")}</h1>
        <p className="relative mt-3 max-w-xl text-muted-foreground">{t("tagline")}</p>
      </section>

      {categories.map((cat) => {
        const tools = TOOLS.filter((t) => t.category === cat);
        if (!tools.length) return null;
        return (
          <section key={cat} className="mt-10">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t(`categories.${cat}`)}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    <div
                      className="absolute inset-x-0 -top-px h-px opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: "var(--gradient-primary)" }}
                    />
                    <div
                      className="grid h-11 w-11 place-items-center rounded-xl text-primary-foreground"
                      style={{ background: tool.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold tracking-tight">{t(`tools.${tool.i18nKey}.title`)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`tools.${tool.i18nKey}.desc`)}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
