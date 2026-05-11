import { Combine, Scissors, Minimize2, RotateCw, LayoutGrid, Droplet, Hash, FileImage, Image as ImageIcon, ScanText } from "lucide-react";
import type { ComponentType } from "react";

export type ToolDef = {
  id: string;
  path: string;
  i18nKey: string;
  category: "organize" | "optimize" | "convert" | "edit" | "security";
  icon: ComponentType<{ className?: string }>;
  accent: string;
};

export const TOOLS: ToolDef[] = [
  { id: "merge", path: "/tools/merge", i18nKey: "merge", category: "organize", icon: Combine, accent: "oklch(0.65 0.20 27)" },
  { id: "split", path: "/tools/split", i18nKey: "split", category: "organize", icon: Scissors, accent: "oklch(0.65 0.18 250)" },
  { id: "organize", path: "/tools/organize", i18nKey: "organize", category: "organize", icon: LayoutGrid, accent: "oklch(0.65 0.18 180)" },
  { id: "compress", path: "/tools/compress", i18nKey: "compress", category: "optimize", icon: Minimize2, accent: "oklch(0.68 0.18 140)" },
  { id: "rotate", path: "/tools/rotate", i18nKey: "rotate", category: "edit", icon: RotateCw, accent: "oklch(0.68 0.18 80)" },
  { id: "watermark", path: "/tools/watermark", i18nKey: "watermark", category: "edit", icon: Droplet, accent: "oklch(0.65 0.20 320)" },
  { id: "pageNumbers", path: "/tools/page-numbers", i18nKey: "pageNumbers", category: "edit", icon: Hash, accent: "oklch(0.65 0.18 200)" },
  { id: "jpgToPdf", path: "/tools/jpg-to-pdf", i18nKey: "jpgToPdf", category: "convert", icon: FileImage, accent: "oklch(0.68 0.18 60)" },
  { id: "pdfToJpg", path: "/tools/pdf-to-jpg", i18nKey: "pdfToJpg", category: "convert", icon: ImageIcon, accent: "oklch(0.65 0.18 30)" },
  { id: "ocr", path: "/tools/ocr", i18nKey: "ocr", category: "convert", icon: ScanText, accent: "oklch(0.62 0.20 290)" },
];