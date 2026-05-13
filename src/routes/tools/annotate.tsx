import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Highlighter, Eraser, ChevronLeft, ChevronRight, Save, MousePointer2, Trash2 } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { renderPageToCanvas, getPageCount } from "@/lib/pdf/pdfjs";
import { applyAnnotations, downloadBlob, type Stroke } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/annotate")({ component: AnnotateTool });

type ToolMode = "pen" | "highlighter";
type EditorMode = "draw" | "select";

const PRESETS: { tool: ToolMode; color: string; rgb: [number, number, number]; width: number; opacity: number; label: string }[] = [
  { tool: "pen", color: "#111827", rgb: [0.07, 0.09, 0.15], width: 2, opacity: 1, label: "Bolígrafo negro" },
  { tool: "pen", color: "#dc2626", rgb: [0.86, 0.15, 0.15], width: 2, opacity: 1, label: "Bolígrafo rojo" },
  { tool: "pen", color: "#1d4ed8", rgb: [0.11, 0.31, 0.85], width: 2, opacity: 1, label: "Bolígrafo azul" },
  { tool: "highlighter", color: "#facc15", rgb: [0.98, 0.8, 0.08], width: 14, opacity: 0.4, label: "Subrayador amarillo" },
  { tool: "highlighter", color: "#4ade80", rgb: [0.29, 0.87, 0.5], width: 14, opacity: 0.4, label: "Subrayador verde" },
  { tool: "highlighter", color: "#f472b6", rgb: [0.96, 0.45, 0.71], width: 14, opacity: 0.4, label: "Subrayador rosa" },
];

function AnnotateTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [presetIdx, setPresetIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<EditorMode>("draw");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const currentKey = useRef<string | null>(null);
  const pageHeightRef = useRef(0);
  const dragRef = useRef<{ id: string; lastX: number; lastY: number } | null>(null);

  const preset = PRESETS[presetIdx];

  useEffect(() => {
    if (!file) return;
    (async () => {
      const buf = await file.arrayBuffer();
      const c = await getPageCount(buf);
      setPageCount(c);
      setPageIndex(0);
      setStrokes([]);
    })();
  }, [file]);

  useEffect(() => {
    if (!file || !pageCount) return;
    (async () => {
      const buf = await file.arrayBuffer();
      const canvas = await renderPageToCanvas(buf, pageIndex + 1, scale);
      const base = baseRef.current!;
      const overlay = overlayRef.current!;
      base.width = canvas.width;
      base.height = canvas.height;
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      base.getContext("2d")!.drawImage(canvas, 0, 0);
      pageHeightRef.current = canvas.height;
      redrawOverlay();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, pageIndex, pageCount, scale]);

  useEffect(() => { redrawOverlay(); /* eslint-disable-next-line */ }, [strokes, pageIndex]);
  useEffect(() => { redrawOverlay(); /* eslint-disable-next-line */ }, [selectedId]);

  function redrawOverlay() {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d")!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const h = pageHeightRef.current;
    const pageStrokes = strokes.filter((s) => s.pageIndex === pageIndex);
    for (const s of pageStrokes) {
      ctx.save();
      ctx.globalAlpha = s.opacity;
      ctx.strokeStyle = `rgb(${Math.round(s.color.r * 255)},${Math.round(s.color.g * 255)},${Math.round(s.color.b * 255)})`;
      ctx.lineWidth = s.width * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const cx = p.x * scale;
        const cy = h - p.y * scale;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.restore();
      if (s.id && s.id === selectedId) {
        // bounding box highlight
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of s.points) {
          const cx = p.x * scale;
          const cy = h - p.y * scale;
          if (cx < minX) minX = cx;
          if (cy < minY) minY = cy;
          if (cx > maxX) maxX = cx;
          if (cy > maxY) maxY = cy;
        }
        const pad = (s.width * scale) / 2 + 4;
        ctx.save();
        ctx.strokeStyle = "hsl(217 91% 60%)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
        ctx.restore();
      }
    }
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = overlayRef.current!.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (overlayRef.current!.width / rect.width);
    const cy = (e.clientY - rect.top) * (overlayRef.current!.height / rect.height);
    return { x: cx / scale, y: (pageHeightRef.current - cy) / scale };
  }

  // Distance from point P to segment AB (in PDF coords)
  function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx, qy = ay + t * dy;
    return Math.hypot(px - qx, py - qy);
  }

  function hitTest(p: { x: number; y: number }): Stroke | null {
    // search from topmost (last drawn) down
    const pageStrokes = strokes.filter((s) => s.pageIndex === pageIndex);
    for (let i = pageStrokes.length - 1; i >= 0; i--) {
      const s = pageStrokes[i];
      const tol = Math.max(s.width / 2, 6 / scale);
      for (let j = 1; j < s.points.length; j++) {
        const a = s.points[j - 1], b = s.points[j];
        if (distToSegment(p.x, p.y, a.x, a.y, b.x, b.y) <= tol) return s;
      }
    }
    return null;
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getPos(e);
    if (mode === "select") {
      const hit = hitTest(p);
      if (hit && hit.id) {
        setSelectedId(hit.id);
        dragRef.current = { id: hit.id, lastX: p.x, lastY: p.y };
        overlayRef.current!.setPointerCapture(e.pointerId);
      } else {
        setSelectedId(null);
      }
      return;
    }
    drawing.current = true;
    overlayRef.current!.setPointerCapture(e.pointerId);
    const key = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    currentKey.current = key;
    currentStroke.current = {
      id: key,
      pageIndex,
      tool: preset.tool,
      color: { r: preset.rgb[0], g: preset.rgb[1], b: preset.rgb[2] },
      width: preset.width,
      opacity: preset.opacity,
      points: [p],
    };
    setStrokes((prev) => [...prev, { ...currentStroke.current! }]);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === "select") {
      if (!dragRef.current) return;
      const p = getPos(e);
      const dx = p.x - dragRef.current.lastX;
      const dy = p.y - dragRef.current.lastY;
      dragRef.current.lastX = p.x;
      dragRef.current.lastY = p.y;
      const id = dragRef.current.id;
      setStrokes((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, points: s.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) } : s,
        ),
      );
      return;
    }
    if (!drawing.current || !currentStroke.current) return;
    currentStroke.current.points.push(getPos(e));
    const key = currentKey.current;
    setStrokes((prev) =>
      prev.map((s) => (s.id === key ? { ...currentStroke.current! } : s)),
    );
  };
  const onUp = () => {
    if (mode === "select") {
      dragRef.current = null;
      return;
    }
    drawing.current = false;
    currentStroke.current = null;
    currentKey.current = null;
  };

  const undo = () => {
    setStrokes((prev) => {
      const lastIdx = [...prev].reverse().findIndex((s) => s.pageIndex === pageIndex);
      if (lastIdx === -1) return prev;
      const realIdx = prev.length - 1 - lastIdx;
      return [...prev.slice(0, realIdx), ...prev.slice(realIdx + 1)];
    });
  };
  const clearPage = () => setStrokes((prev) => prev.filter((s) => s.pageIndex !== pageIndex));
  const deleteSelected = () => {
    if (!selectedId) return;
    setStrokes((prev) => prev.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await applyAnnotations(file, strokes);
      downloadBlob(data, file.name.replace(/\.pdf$/i, "_annotated.pdf"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Pencil className="h-5 w-5" />} title={t("tools.annotate.title")} desc={t("tools.annotate.desc")}>
      {!file ? (
        <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1 border-r border-border pr-2">
              <button
                onClick={() => setMode("select")}
                title={t("annotate.select")}
                className={`grid h-9 w-9 place-items-center rounded-md border ${mode === "select" ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border hover:bg-secondary"}`}
              >
                <MousePointer2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setMode("draw"); setSelectedId(null); }}
                title={t("annotate.draw")}
                className={`grid h-9 w-9 place-items-center rounded-md border ${mode === "draw" ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border hover:bg-secondary"}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setPresetIdx(i); setMode("draw"); setSelectedId(null); }}
                  title={p.label}
                  className={`grid h-9 w-9 place-items-center rounded-md border ${i === presetIdx && mode === "draw" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                  style={{ background: p.tool === "highlighter" ? `${p.color}66` : p.color }}
                >
                  {p.tool === "pen" ? <Pencil className="h-4 w-4 text-white mix-blend-difference" /> : <Highlighter className="h-4 w-4 text-white mix-blend-difference" />}
                </button>
              ))}
            </div>
            <div className="ml-2 flex items-center gap-2">
              <button onClick={undo} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
                {t("annotate.undo")}
              </button>
              {mode === "select" && selectedId && (
                <button onClick={deleteSelected} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-4 w-4" />
                  {t("remove")}
                </button>
              )}
              <button onClick={clearPage} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
                <Eraser className="h-4 w-4" />
                {t("annotate.clearPage")}
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setScale((s) => Math.max(0.75, +(s - 0.25).toFixed(2)))} className="rounded-md border border-border px-2 py-1 text-sm">−</button>
              <span className="w-12 text-center text-sm tabular-nums">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))} className="rounded-md border border-border px-2 py-1 text-sm">+</button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
            <button disabled={pageIndex === 0} onClick={() => setPageIndex((i) => i - 1)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm disabled:opacity-40 hover:bg-secondary">
              <ChevronLeft className="h-4 w-4" /> {t("annotate.prev")}
            </button>
            <span className="text-sm text-muted-foreground">{t("page")} {pageIndex + 1} / {pageCount}</span>
            <button disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex((i) => i + 1)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm disabled:opacity-40 hover:bg-secondary">
              {t("annotate.next")} <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mx-auto w-fit overflow-auto rounded-xl border border-border bg-secondary/30 p-3 shadow-[var(--shadow-card)]">
            <div className="relative" style={{ width: baseRef.current?.width, height: baseRef.current?.height }}>
              <canvas ref={baseRef} className="block bg-white" />
              <canvas
                ref={overlayRef}
                className="absolute left-0 top-0 touch-none"
                style={{ cursor: mode === "select" ? (dragRef.current ? "grabbing" : "grab") : preset.tool === "pen" ? "crosshair" : "cell" }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => { setFile(null); setStrokes([]); }} className="text-sm text-muted-foreground hover:text-foreground">{t("clear")}</button>
            <RunButton loading={busy} onClick={save}><Save className="h-4 w-4" /> {t("annotate.save")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}