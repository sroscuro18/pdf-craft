import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileImage } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { FileList } from "@/components/pdf/FileList";
import { RunButton } from "@/components/pdf/RunButton";
import { uid } from "@/components/pdf/uid";
import { jpgToPdf, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/jpg-to-pdf")({ component: JpgToPdfTool });

function JpgToPdfTool() {
  const { t } = useTranslation();
  const [items, setItems] = useState<{ id: string; file: File }[]>([]);
  const [busy, setBusy] = useState(false);

  const add = (files: File[]) => setItems((s) => [...s, ...files.map((f) => ({ id: uid(), file: f }))]);
  const remove = (id: string) => setItems((s) => s.filter((i) => i.id !== id));
  const reorder = (from: number, to: number) => setItems((s) => { const n = [...s]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });

  const run = async () => {
    setBusy(true);
    try {
      const out = await jpgToPdf(items.map((i) => i.file));
      downloadBlob(out, "images.pdf");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<FileImage className="h-5 w-5" />} title={t("tools.jpgToPdf.title")} desc={t("tools.jpgToPdf.desc")}>
      <Dropzone onFiles={add} accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] }} />
      <FileList items={items.map((i) => ({ id: i.id, name: i.file.name, size: i.file.size }))} onRemove={remove} onReorder={reorder} />
      <div className="mt-6 flex justify-end">
        <RunButton loading={busy} disabled={items.length === 0} onClick={run}>{t("run")}</RunButton>
      </div>
    </ToolShell>
  );
}