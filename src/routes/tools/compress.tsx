import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minimize2 } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { compressPdf, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/compress")({ component: CompressTool });

function CompressTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ before: number; after: number } | null>(null);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await compressPdf(file, level);
      setResult({ before: file.size, after: out.length });
      downloadBlob(out, file.name.replace(/\.pdf$/i, "") + "_compressed.pdf");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Minimize2 className="h-5 w-5" />} title={t("tools.compress.title")} desc={t("tools.compress.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{file.name} <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span></p>
          <div className="mt-4">
            <label className="text-sm font-medium">{t("compress.level")}</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={`rounded-md border px-3 py-2 text-sm ${level === lv ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary"}`}
                >
                  {t(`compress.${lv}`)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("compress.note")}</p>
          </div>
          {result && (
            <p className="mt-3 text-sm">
              {(result.before / 1024).toFixed(0)} KB → {(result.after / 1024).toFixed(0)} KB
              <span className="ml-2 text-primary">
                ({Math.max(0, Math.round((1 - result.after / result.before) * 100))}%)
              </span>
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setFile(null); setResult(null); }} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              {t("clear")}
            </button>
            <RunButton loading={busy} onClick={run}>{t("run")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}