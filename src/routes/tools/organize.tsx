import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, X } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { organizePages, downloadBlob } from "@/lib/pdf/operations";
import { renderPageToCanvas, getPageCount } from "@/lib/pdf/pdfjs";

export const Route = createFileRoute("/tools/organize")({ component: OrganizeTool });

type Thumb = { originalIndex: number; src: string };

function OrganizeTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const buf = await file.arrayBuffer();
      const count = await getPageCount(buf);
      const result: Thumb[] = [];
      for (let i = 1; i <= count; i++) {
        if (cancelled) return;
        const canvas = await renderPageToCanvas(buf, i, 0.4);
        result.push({ originalIndex: i - 1, src: canvas.toDataURL("image/jpeg", 0.75) });
      }
      if (!cancelled) {
        setThumbs(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const remove = (idx: number) => setThumbs((s) => s.filter((_, i) => i !== idx));
  const move = (from: number, to: number) =>
    setThumbs((s) => {
      const next = [...s];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await organizePages(file, thumbs.map((t) => t.originalIndex));
      downloadBlob(out, file.name.replace(/\.pdf$/i, "") + "_organized.pdf");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<LayoutGrid className="h-5 w-5" />} title={t("tools.organize.title")} desc={t("tools.organize.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{file.name}</p>
            <button onClick={() => { setFile(null); setThumbs([]); }} className="text-sm text-muted-foreground hover:text-foreground">{t("clear")}</button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("processing")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {thumbs.map((th, idx) => (
                <div
                  key={`${th.originalIndex}-${idx}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(idx))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => move(Number(e.dataTransfer.getData("text/plain")), idx)}
                  className="group relative rounded-lg border border-border bg-card p-2 shadow-sm transition-all hover:border-primary/50"
                >
                  <img src={th.src} alt={`page ${th.originalIndex + 1}`} className="w-full rounded" />
                  <div className="mt-1 text-center text-xs text-muted-foreground">{idx + 1}</div>
                  <button onClick={() => remove(idx)} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <RunButton loading={busy} disabled={thumbs.length === 0} onClick={run}>{t("run")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}