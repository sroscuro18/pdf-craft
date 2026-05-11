import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { rotatePdf, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/rotate")({ component: RotateTool });

function RotateTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await rotatePdf(file, angle);
      downloadBlob(out, file.name.replace(/\.pdf$/i, "") + "_rotated.pdf");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<RotateCw className="h-5 w-5" />} title={t("tools.rotate.title")} desc={t("tools.rotate.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{file.name}</p>
          <div className="mt-4">
            <label className="text-sm font-medium">{t("rotate.angle")}</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([90, 180, 270] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAngle(a)}
                  className={`rounded-md border px-3 py-2 text-sm ${angle === a ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary"}`}
                >
                  {a}°
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setFile(null)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              {t("clear")}
            </button>
            <RunButton loading={busy} onClick={run}>{t("run")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}