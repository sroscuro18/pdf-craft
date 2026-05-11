import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Combine } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { FileList } from "@/components/pdf/FileList";
import { RunButton } from "@/components/pdf/RunButton";
import { uid } from "@/components/pdf/uid";
import { mergePdfs, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/merge")({ component: MergeTool });

type Entry = { id: string; file: File };

function MergeTool() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (files: File[]) =>
    setItems((s) => [...s, ...files.map((f) => ({ id: uid(), file: f }))]);
  const remove = (id: string) => setItems((s) => s.filter((i) => i.id !== id));
  const reorder = (from: number, to: number) =>
    setItems((s) => {
      const next = [...s];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await mergePdfs(items.map((i) => i.file));
      downloadBlob(out, "merged.pdf");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Combine className="h-5 w-5" />} title={t("tools.merge.title")} desc={t("tools.merge.desc")}>
      <Dropzone onFiles={add} hint={t("merge.hint")} />
      <FileList
        items={items.map((i) => ({ id: i.id, name: i.file.name, size: i.file.size }))}
        onRemove={remove}
        onReorder={reorder}
      />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex justify-end">
        <RunButton loading={busy} disabled={items.length < 2} onClick={run}>
          {t("run")}
        </RunButton>
      </div>
    </ToolShell>
  );
}