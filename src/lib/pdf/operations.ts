import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import { renderPageToCanvas, getPageCount } from "./pdfjs";

export function downloadBlob(data: Uint8Array | Blob, filename: string, mime = "application/pdf") {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

export function parseRanges(spec: string, max: number): number[][] {
  return spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((n) => parseInt(n, 10));
        const start = Math.max(1, Math.min(a, b));
        const end = Math.min(max, Math.max(a, b));
        const r: number[] = [];
        for (let i = start; i <= end; i++) r.push(i - 1);
        return r;
      }
      const n = parseInt(part, 10);
      return n >= 1 && n <= max ? [n - 1] : [];
    })
    .filter((r) => r.length > 0);
}

export async function splitPdf(file: File, spec: string): Promise<{ name: string; data: Uint8Array }[]> {
  const src = await PDFDocument.load(await file.arrayBuffer());
  const total = src.getPageCount();
  const ranges = parseRanges(spec, total);
  const outs: { name: string; data: Uint8Array }[] = [];
  const base = file.name.replace(/\.pdf$/i, "");
  let i = 1;
  for (const r of ranges) {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, r);
    pages.forEach((p) => doc.addPage(p));
    outs.push({ name: `${base}_part${i++}.pdf`, data: await doc.save() });
  }
  return outs;
}

export async function rotatePdf(file: File, angle: 90 | 180 | 270, pageSpec?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const total = doc.getPageCount();
  const targets = pageSpec
    ? new Set(parseRanges(pageSpec, total).flat())
    : new Set(doc.getPageIndices());
  doc.getPages().forEach((p, idx) => {
    if (targets.has(idx)) {
      const current = p.getRotation().angle;
      p.setRotation(degrees((current + angle) % 360));
    }
  });
  return doc.save();
}

export async function addWatermark(
  file: File,
  opts: { text: string; opacity: number; angle: number; size: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.getPages().forEach((p) => {
    const { width, height } = p.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, opts.size);
    p.drawText(opts.text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: opts.size,
      font,
      color: rgb(0.7, 0.1, 0.15),
      opacity: opts.opacity,
      rotate: degrees(opts.angle),
    });
  });
  return doc.save();
}

export async function addPageNumbers(
  file: File,
  opts: { position: "bottom-center" | "bottom-right" | "top-right"; format: string; start: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  doc.getPages().forEach((p, idx) => {
    const { width, height } = p.getSize();
    const label = opts.format
      .replace("{n}", String(idx + opts.start))
      .replace("{total}", String(total + opts.start - 1));
    const size = 11;
    const tw = font.widthOfTextAtSize(label, size);
    let x = width / 2 - tw / 2;
    let y = 24;
    if (opts.position === "bottom-right") {
      x = width - tw - 24;
      y = 24;
    } else if (opts.position === "top-right") {
      x = width - tw - 24;
      y = height - 24 - size;
    }
    p.drawText(label, { x, y, size, font, color: rgb(0.1, 0.1, 0.1) });
  });
  return doc.save();
}

export async function organizePages(
  file: File,
  order: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(await file.arrayBuffer());
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, order);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

export async function jpgToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const f of files) {
    const buf = await f.arrayBuffer();
    const img =
      f.type === "image/png"
        ? await doc.embedPng(buf)
        : await doc.embedJpg(buf);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}

export async function pdfToJpg(file: File, scale = 2): Promise<{ name: string; blob: Blob }[]> {
  const buf = await file.arrayBuffer();
  const count = await getPageCount(buf);
  const base = file.name.replace(/\.pdf$/i, "");
  const out: { name: string; blob: Blob }[] = [];
  for (let i = 1; i <= count; i++) {
    const canvas = await renderPageToCanvas(buf, i, scale);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
    );
    out.push({ name: `${base}_page${i}.jpg`, blob });
  }
  return out;
}

/**
 * "Compresión" aproximada en navegador: re-encoda imágenes a JPEG con calidad
 * configurable usando PDF.js para extraer páginas, y limpia metadatos.
 * Para archivos PDF basados en texto, devuelve el archivo limpio sin grandes ganancias.
 */
export async function compressPdf(
  file: File,
  level: "low" | "medium" | "high",
): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  // Limpia metadatos
  src.setTitle("");
  src.setAuthor("");
  src.setSubject("");
  src.setKeywords([]);
  src.setProducer("PDF Studio");
  src.setCreator("PDF Studio");
  const cleaned = await src.save({ useObjectStreams: true });

  const qualityMap = { low: 0.85, medium: 0.65, high: 0.45 } as const;
  const scaleMap = { low: 1.5, medium: 1.2, high: 1.0 } as const;
  const quality = qualityMap[level];
  const scale = scaleMap[level];

  // Si el original es pequeño, devuelve el limpiado
  if (file.size < 500_000) return cleaned;

  // Reconstruye recomprimiendo cada página como imagen JPEG
  const count = await getPageCount(buf);
  const out = await PDFDocument.create();
  for (let i = 1; i <= count; i++) {
    const canvas = await renderPageToCanvas(buf, i, scale);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality),
    );
    const ab = await blob.arrayBuffer();
    const img = await out.embedJpg(ab);
    const page = out.addPage([canvas.width, canvas.height]);
    page.drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height });
  }
  const recompressed = await out.save();
  // Devuelve la versión más pequeña
  return recompressed.length < cleaned.length ? recompressed : cleaned;
}

/* ============================================================
 * Annotations (pen + highlighter)
 * Strokes are stored in PDF user-space units (origin bottom-left).
 * ============================================================ */
export type Stroke = {
  id?: string;
  pageIndex: number;
  tool: "pen" | "highlighter";
  color: { r: number; g: number; b: number };
  width: number; // pt
  opacity: number;
  points: { x: number; y: number }[]; // PDF coords
};

export async function applyAnnotations(file: File, strokes: Stroke[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const pages = doc.getPages();
  for (const s of strokes) {
    const page = pages[s.pageIndex];
    if (!page || s.points.length < 2) continue;
    const color = rgb(s.color.r, s.color.g, s.color.b);
    for (let i = 1; i < s.points.length; i++) {
      const a = s.points[i - 1];
      const b = s.points[i];
      page.drawLine({
        start: { x: a.x, y: a.y },
        end: { x: b.x, y: b.y },
        thickness: s.width,
        color,
        opacity: s.opacity,
        lineCap: 1,
      });
    }
  }
  return doc.save();
}

/* ============================================================
 * Text block editing
 * Detected via PDF.js getTextContent. Edits replace original
 * region with a white rectangle and redraw modified text.
 * ============================================================ */
export type TextBlock = {
  id: string;
  pageIndex: number;
  text: string;
  x: number; // PDF coords (bottom-left of block)
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

export type TextEdit =
  | { id: string; type: "delete" }
  | { id: string; type: "update"; text: string; x: number; y: number };

export async function applyTextEdits(
  file: File,
  blocks: TextBlock[],
  edits: TextEdit[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const editMap = new Map(edits.map((e) => [e.id, e]));
  for (const b of blocks) {
    const e = editMap.get(b.id);
    if (!e) continue;
    const page = pages[b.pageIndex];
    if (!page) continue;
    // Cover original text with a white box
    page.drawRectangle({
      x: b.x - 1,
      y: b.y - 2,
      width: b.width + 2,
      height: b.height + 4,
      color: rgb(1, 1, 1),
    });
    if (e.type === "update" && e.text.trim()) {
      page.drawText(e.text, {
        x: e.x,
        y: e.y,
        size: b.fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }
  return doc.save();
}

export async function extractTextBlocks(
  file: File,
): Promise<{ blocks: TextBlock[]; pageSizes: { width: number; height: number }[] }> {
  const { getPdfJs } = await import("./pdfjs");
  const pdfjs = await getPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const blocks: TextBlock[] = [];
  const pageSizes: { width: number; height: number }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes.push({ width: viewport.width, height: viewport.height });
    const content = await page.getTextContent();
    let idx = 0;
    for (const item of content.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>) {
      if (!item.str || !item.str.trim()) continue;
      const [a, , , d, x, y] = item.transform;
      const fontSize = Math.hypot(a, d) || item.height || 10;
      blocks.push({
        id: `p${i - 1}_${idx++}`,
        pageIndex: i - 1,
        text: item.str,
        x,
        y,
        width: item.width,
        height: fontSize,
        fontSize,
      });
    }
  }
  await pdf.destroy();
  return { blocks, pageSizes };
}