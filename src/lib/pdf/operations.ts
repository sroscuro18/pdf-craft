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