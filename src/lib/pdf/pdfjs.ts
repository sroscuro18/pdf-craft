// Lazy PDF.js loader — browser only (uses worker via blob URL to avoid bundler path issues)
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfJs() {
  if (typeof window === "undefined") throw new Error("PDF.js is browser-only");
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Use the bundled worker via Vite ?url import
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function renderPageToCanvas(
  data: ArrayBuffer,
  pageNumber: number,
  scale = 1.0,
): Promise<HTMLCanvasElement> {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  await doc.destroy();
  return canvas;
}

export async function getPageCount(data: ArrayBuffer): Promise<number> {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const n = doc.numPages;
  await doc.destroy();
  return n;
}