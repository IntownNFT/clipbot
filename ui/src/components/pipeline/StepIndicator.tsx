"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  Download,
  FileText,
  Brain,
  Scissors,
  Captions,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

const STEPS = [
  { key: "downloading", label: "Download", icon: Download },
  { key: "transcribing", label: "Transcribe", icon: FileText },
  { key: "analyzing", label: "Analyze", icon: Brain },
  { key: "clipping", label: "Clip", icon: Scissors },
  { key: "publishing", label: "Caption", icon: Captions },
  { key: "complete", label: "Complete", icon: CheckCircle2 },
] as const;

const stepOrder = STEPS.map((s) => s.key);

interface StepIndicatorProps {
  currentStep: string;
  className?: string;
}

export function StepIndicator({ currentStep, className }: StepIndicatorProps) {
  const currentIdx = stepOrder.indexOf(currentStep as typeof stepOrder[number]);
  const isFailed = currentStep === "failed";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.key === currentStep;
        const isDone = currentIdx > idx || currentStep === "complete";
        const isCurrent = isActive && !isDone;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <motion.div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                isDone && "bg-accent/15 text-accent",
                isCurrent && !isFailed && "bg-brand-gold/15 text-brand-gold",
                isFailed && isActive && "bg-red-500/15 text-red-400",
                !isDone && !isCurrent && "bg-surface-2 text-muted"
              )}
              initial={{ scale: 0.9 }}
              animate={{
                scale: isCurrent ? 1.05 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {isCurrent && !isFailed ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isFailed && isActive ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {step.label}
            </motion.div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-4 transition-all duration-200",
                  isDone ? "bg-accent/40" : "bg-border/50"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
