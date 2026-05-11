import type { ReactNode } from "react";

export function RunButton({
  loading,
  disabled,
  onClick,
  children,
}: {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: "var(--gradient-primary)" }}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />}
      {children}
    </button>
  );
}