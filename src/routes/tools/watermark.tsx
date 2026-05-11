import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Droplet } from "lucide-react";
import { ToolShell } from "@/components/pdf/ToolShell";
import { Dropzone } from "@/components/pdf/Dropzone";
import { RunButton } from "@/components/pdf/RunButton";
import { addWatermark, downloadBlob } from "@/lib/pdf/operations";

export const Route = createFileRoute("/tools/watermark")({ component: WatermarkTool });

function WatermarkTool() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.2);
  const [angle, setAngle] = useState(45);
  const [size, setSize] = useState(64);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const out = await addWatermark(file, { text, opacity, angle, size });
      downloadBlob(out, file.name.replace(/\.pdf$/i, "") + "_watermarked.pdf");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell icon={<Droplet className="h-5 w-5" />} title={t("tools.watermark.title")} desc={t("tools.watermark.desc")}>
      {!file ? (
        <Dropzone onFiles={(f) => setFile(f[0])} multiple={false} />
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{file.name}</p>
          <div>
            <label className="text-sm font-medium">{t("watermark.text")}</label>
            <input value={text} onChange={(e) => setText(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Slider label={t("watermark.opacity")} value={opacity} min={0.05} max={1} step={0.05} onChange={setOpacity} format={(v) => v.toFixed(2)} />
            <Slider label={t("watermark.angle")} value={angle} min={0} max={360} step={5} onChange={setAngle} format={(v) => `${v}°`} />
            <Slider label={t("watermark.size")} value={size} min={16} max={160} step={2} onChange={setSize} format={(v) => `${v}px`} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFile(null)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">{t("clear")}</button>
            <RunButton loading={busy} onClick={run}>{t("run")}</RunButton>
          </div>
        </div>
      )}
    </ToolShell>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[color:var(--primary)]" />
    </div>
  );
}