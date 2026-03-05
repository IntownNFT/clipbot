"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastItem, ToastType } from "@/contexts/ToastContext";

const typeStyles: Record<ToastType, string> = {
  success: "border-green-500/30 bg-green-500/10",
  error: "border-red-500/30 bg-red-500/10",
  info: "border-accent/30 bg-accent/10",
};

const typeIconColors: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-accent",
};

const typeIcons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = typeIcons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3",
        "bg-surface-1 shadow-elevation-2 min-w-[300px] max-w-[420px]",
        typeStyles[toast.type]
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", typeIconColors[toast.type])} />
      <p className="flex-1 text-sm text-foreground leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg p-1 text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
