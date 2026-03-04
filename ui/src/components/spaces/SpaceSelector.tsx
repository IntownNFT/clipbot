"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Layers } from "lucide-react";
import { useSpaces } from "@/hooks/useSpaces";
import { cn } from "@/lib/utils";

interface SpaceSelectorProps {
  value: string | null;
  onChange: (id: string) => void;
  /** When true, clicking the button does nothing (used on space detail pages) */
  readOnly?: boolean;
}

export function SpaceSelector({ value, onChange, readOnly }: SpaceSelectorProps) {
  const { spaces } = useSpaces();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const selected = spaces.find((s) => s.id === value);

  // Auto-select first space if none selected
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (value === null && spaces.length > 0) {
      onChangeRef.current(spaces[0].id);
    }
  }, [value, spaces]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.top,
      left: rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !readOnly && setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
          readOnly ? "cursor-default" : "cursor-pointer",
          "text-muted hover:text-foreground hover:bg-surface-2"
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>{selected ? selected.name : "Space"}</span>
        {!readOnly && <ChevronDown className="h-3 w-3" />}
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-56 bg-surface-1 border border-border rounded-xl shadow-elevation-3 overflow-hidden z-[100] flex flex-col"
            style={{
              top: pos.top - 8,
              left: pos.left - 224,
              transform: "translateY(-100%)",
              maxHeight: "min(320px, 50vh)",
            }}
          >
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => { onChange(space.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-surface-2 transition-colors cursor-pointer",
                    value === space.id && "bg-accent/8 text-accent"
                  )}
                >
                  {space.icon ? (
                    <span className="text-base">{space.icon}</span>
                  ) : (
                    <Layers className="h-4 w-4 text-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{space.name}</div>
                    {space.description && (
                      <div className="text-xs text-muted truncate">{space.description}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-border/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setOpen(false); router.push("/spaces/new"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-accent hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create new space</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
