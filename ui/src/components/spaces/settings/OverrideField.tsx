"use client";

interface OverrideFieldProps {
  label: string;
  isOverridden: boolean;
  globalDefault?: string;
  onReset: () => void;
  children: React.ReactNode;
}

export function OverrideField({
  label,
  isOverridden,
  globalDefault,
  onReset,
  children,
}: OverrideFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isOverridden ? "bg-accent" : "bg-muted/40"
            }`}
          />
          <label className="text-sm text-muted">{label}</label>
        </div>
        {isOverridden && (
          <button
            onClick={onReset}
            className="text-[10px] text-accent hover:text-accent/80 transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
      {children}
      {isOverridden && globalDefault !== undefined && (
        <p className="text-[10px] text-muted/60">Default: {globalDefault}</p>
      )}
    </div>
  );
}
