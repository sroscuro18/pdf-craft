import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Scissors } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { splitPdf, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/split")({ component: SplitTool });

function SplitTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [spec, setSpec] = useState("1-1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const parts = await splitPdf(file, spec);
      parts.forEach((p) => downloadBlob(p.data, p.name));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Scissors className="h-5 w-5" />} title={t("tools.split.title")} desc={t("tools.split.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{file.name}</p>
          <div className="mt-4">
            <label className="text-sm font-medium">{t("split.ranges")}</label>
            <input
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="1-3,5,7-9"
            />
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setFile(null)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              {t("clear")}
            </button>
            <RunButton loading={busy} onClick={run}>
              {t("split.split")}
            </RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}