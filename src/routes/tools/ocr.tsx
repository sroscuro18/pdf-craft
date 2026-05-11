import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScanText, Copy, Download } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { renderPageToCanvas, getPageCount } from "@/lib/pdf/pdfjs";
import { downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/ocr")({ component: OcrTool });

function OcrTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<"spa" | "eng">("spa");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setText("");
    setProgress(0);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      let all = "";
      if (file.type === "application/pdf") {
        const buf = await file.arrayBuffer();
        const count = await getPageCount(buf);
        for (let i = 1; i <= count; i++) {
          const canvas = await renderPageToCanvas(buf, i, 2);
          const { data } = await worker.recognize(canvas);
          all += `\n--- ${t("page")} ${i} ---\n${data.text}\n`;
        }
      } else {
        const { data } = await worker.recognize(file);
        all = data.text;
      }
      await worker.terminate();
      setText(all.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<ScanText className="h-5 w-5" />} title={t("tools.ocr.title")} desc={t("tools.ocr.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} accept={{ "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".webp"] }} />
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{file.name}</p>
            <button onClick={() => { setFile(null); setText(""); }} className="text-sm text-muted-foreground hover:text-foreground">{t("clear")}</button>
          </div>
          <div>
            <label className="text-sm font-medium">{t("ocr.lang")}</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setLang("spa")} className={`rounded-md border px-3 py-2 text-sm ${lang === "spa" ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary"}`}>{t("ocr.spanish")}</button>
              <button onClick={() => setLang("eng")} className={`rounded-md border px-3 py-2 text-sm ${lang === "eng" ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary"}`}>{t("ocr.english")}</button>
            </div>
          </div>
          <div className="flex justify-end">
            <RunButton loading={busy} onClick={run}>{t("run")}</RunButton>
          </div>
          {busy && progress > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--gradient-primary)" }} />
            </div>
          )}
          {text && (
            <>
              <textarea readOnly value={text} className="min-h-[260px] w-full rounded-md border border-input bg-background p-3 text-sm font-mono" />
              <div className="flex justify-end gap-2">
                <button onClick={() => navigator.clipboard.writeText(text)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
                  <Copy className="h-4 w-4" /> {t("ocr.copy")}
                </button>
                <button onClick={() => downloadBlob(new Blob([text], { type: "text/plain" }), "ocr.txt", "text/plain")} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
                  <Download className="h-4 w-4" /> {t("ocr.downloadTxt")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}