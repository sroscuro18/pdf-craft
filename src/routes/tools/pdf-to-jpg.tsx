import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { pdfToJpg, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/pdf-to-jpg")({ component: PdfToJpgTool });

function PdfToJpgTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setResults([]);
    try {
      const imgs = await pdfToJpg(file, 2);
      const urls = imgs.map((i) => ({ name: i.name, url: URL.createObjectURL(i.blob) }));
      setResults(urls);
      imgs.forEach((i) => downloadBlob(i.blob, i.name, "image/jpeg"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<ImageIcon className="h-5 w-5" />} title={t("tools.pdfToJpg.title")} desc={t("tools.pdfToJpg.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{file.name}</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setFile(null); setResults([]); }} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">{t("clear")}</button>
            <RunButton loading={busy} onClick={run}>{t("run")}</RunButton>
          </div>
          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {results.map((r) => (
                <img key={r.name} src={r.url} alt={r.name} className="rounded border border-border" />
              ))}
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}