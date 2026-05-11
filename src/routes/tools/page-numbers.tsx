import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Hash } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { addPageNumbers, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/page-numbers")({ component: PageNumbersTool });

function PageNumbersTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<"bottom-center" | "bottom-right" | "top-right">("bottom-center");
  const [format, setFormat] = useState("{n} / {total}");
  const [start, setStart] = useState(1);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await addPageNumbers(file, { position, format, start });
      downloadBlob(out, file.name.replace(/\.pdf$/i, "") + "_numbered.pdf");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Hash className="h-5 w-5" />} title={t("tools.pageNumbers.title")} desc={t("tools.pageNumbers.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{file.name}</p>
          <div>
            <label className="text-sm font-medium">{t("pageNumbers.position")}</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["bottom-center", "bottom-right", "top-right"] as const).map((p) => (
                <button key={p} onClick={() => setPosition(p)} className={`rounded-md border px-3 py-2 text-xs ${position === p ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t("pageNumbers.format")}</label>
              <input value={format} onChange={(e) => setFormat(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("pageNumbers.start")}</label>
              <input type="number" value={start} onChange={(e) => setStart(Number(e.target.value) || 1)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFile(null)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">{t("clear")}</button>
            <RunButton loading={busy} onClick={run}>{t("run")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}