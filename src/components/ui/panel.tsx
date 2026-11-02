import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-lg bg-surface p-6 shadow-panel", className)}>{children}</section>;
}

export function ChoiceGroup({
  legend,
  hint,
  columnsClassName,
  children,
}: {
  legend: string;
  hint?: string;
  columnsClassName?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      {hint ? <p className="text-sm text-pretty text-muted">{hint}</p> : null}
      <div className={cn("grid grid-cols-2 gap-2", columnsClassName)}>{children}</div>
    </fieldset>
  );
}

export function ChoiceButton({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-md border px-3 py-2 text-center text-base leading-tight font-semibold transition-colors duration-200 disabled:opacity-50",
        pressed
          ? "border-primary bg-primary text-primary-fg"
          : "border-line bg-paper text-ink hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}
