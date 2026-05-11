import { useDropzone, type Accept } from "react-dropzone";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  hint,
}: {
  onFiles: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  hint?: string;
}) {
  const { t } = useTranslation();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: accept ?? { "application/pdf": [".pdf"] },
    multiple,
    onDrop: onFiles,
  });
  return (
    <div
      {...getRootProps()}
      className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
        isDragActive
          ? "border-primary bg-accent/40"
          : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40"
      }`}
    >
      <input {...getInputProps()} />
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
        <Upload className="h-6 w-6 text-primary-foreground" />
      </div>
      <p className="mt-4 text-base font-medium">{t("dropHere")}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}