import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Type, Trash2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { renderPageToCanvas } from "@/lib/pdf/pdfjs";
import {
  applyTextEdits,
  downloadBlob,
  extractTextBlocks,
  type TextBlock,
  type TextEdit,
} from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/edit-text")({ component: EditTextTool });

type EditState = {
  text: string;
  x: number;
  y: number;
  deleted: boolean;
  dirty: boolean;
};

function EditTextTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [pageSizes, setPageSizes] = useState<{ width: number; height: number }[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [scale] = useState(1.5);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const dragInfo = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    (async () => {
      try {
        const { blocks, pageSizes } = await extractTextBlocks(file);
        setBlocks(blocks);
        setPageSizes(pageSizes);
        setEdits({});
        setPageIndex(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [file]);

  useEffect(() => {
    if (!file || !pageSizes.length) return;
    (async () => {
      const buf = await file.arrayBuffer();
      const c = await renderPageToCanvas(buf, pageIndex + 1, scale);
      const base = baseRef.current!;
      base.width = c.width;
      base.height = c.height;
      base.getContext("2d")!.drawImage(c, 0, 0);
    })();
  }, [file, pageIndex, pageSizes, scale]);

  const pageBlocks = useMemo(() => blocks.filter((b) => b.pageIndex === pageIndex), [blocks, pageIndex]);
  const pageSize = pageSizes[pageIndex];

  const getEdit = (b: TextBlock): EditState =>
    edits[b.id] ?? { text: b.text, x: b.x, y: b.y, deleted: false, dirty: false };

  const updateEdit = (b: TextBlock, patch: Partial<EditState>) => {
    setEdits((prev) => {
      const cur = prev[b.id] ?? { text: b.text, x: b.x, y: b.y, deleted: false, dirty: false };
      return { ...prev, [b.id]: { ...cur, ...patch, dirty: true } };
    });
  };

  const onDragStart = (e: React.PointerEvent, b: TextBlock) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
    setSelected(b.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragInfo.current = { id: b.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragInfo.current || !pageSize) return;
    const b = blocks.find((bl) => bl.id === dragInfo.current!.id);
    if (!b) return;
    const container = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    const px = e.clientX - container.left - dragInfo.current.offsetX;
    const py = e.clientY - container.top - dragInfo.current.offsetY;
    const newX = px / scale;
    const newY = pageSize.height - py / scale - b.fontSize;
    updateEdit(b, { x: newX, y: newY });
  };
  const onDragEnd = () => { dragInfo.current = null; };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const list: TextEdit[] = [];
      for (const id in edits) {
        const e = edits[id];
        if (!e.dirty) continue;
        if (e.deleted) list.push({ id, type: "delete" });
        else list.push({ id, type: "update", text: e.text, x: e.x, y: e.y });
      }
      const data = await applyTextEdits(file, blocks, list);
      downloadBlob(data, file.name.replace(/\.pdf$/i, "_edited.pdf"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Type className="h-5 w-5" />} title={t("tools.editText.title")} desc={t("tools.editText.desc")}>
      {!file ? (
        <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {t("editText.note")}
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{t("processing")}</div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                <button disabled={pageIndex === 0} onClick={() => { setPageIndex((i) => i - 1); setSelected(null); }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm disabled:opacity-40 hover:bg-secondary">
                  <ChevronLeft className="h-4 w-4" /> {t("annotate.prev")}
                </button>
                <span className="text-sm text-muted-foreground">{t("page")} {pageIndex + 1} / {pageSizes.length}</span>
                <button disabled={pageIndex >= pageSizes.length - 1} onClick={() => { setPageIndex((i) => i + 1); setSelected(null); }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm disabled:opacity-40 hover:bg-secondary">
                  {t("annotate.next")} <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mx-auto w-fit overflow-auto rounded-xl border border-border bg-secondary/30 p-3 shadow-[var(--shadow-card)]">
                <div className="relative" style={{ width: baseRef.current?.width, height: baseRef.current?.height }}>
                  <canvas ref={baseRef} className="block bg-white" />
                  {pageSize && pageBlocks.map((b) => {
                    const e = getEdit(b);
                    if (e.deleted) return null;
                    const left = e.x * scale;
                    const top = (pageSize.height - e.y - b.fontSize) * scale;
                    const isSel = selected === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`group absolute touch-none rounded transition-colors ${isSel ? "bg-primary/10 ring-2 ring-primary" : "ring-1 ring-transparent hover:bg-primary/5 hover:ring-primary/40"}`}
                        style={{
                          left,
                          top: top - 2,
                          minWidth: Math.max(b.width * scale, 30),
                          padding: "1px 2px",
                          cursor: dragInfo.current?.id === b.id ? "grabbing" : "grab",
                        }}
                        onPointerDown={(ev) => onDragStart(ev, b)}
                        onPointerMove={onDragMove}
                        onPointerUp={onDragEnd}
                        onClick={() => setSelected(b.id)}
                      >
                        <textarea
                          value={e.text}
                          onChange={(ev) => updateEdit(b, { text: ev.target.value })}
                          onFocus={() => setSelected(b.id)}
                          rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent font-sans leading-tight outline-none"
                          style={{
                            fontSize: b.fontSize * scale,
                            color: e.dirty ? "hsl(var(--primary))" : "rgba(0,0,0,0.85)",
                            minWidth: Math.max(b.width * scale, 30),
                          }}
                        />
                        {isSel && (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); updateEdit(b, { deleted: true }); }}
                            className="absolute -right-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                            title={t("remove")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => { setFile(null); setBlocks([]); setEdits({}); }} className="text-sm text-muted-foreground hover:text-foreground">{t("clear")}</button>
            <RunButton loading={busy} onClick={save}><Save className="h-4 w-4" /> {t("annotate.save")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}