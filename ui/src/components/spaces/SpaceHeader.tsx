"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";

interface SpaceHeaderProps {
  name: string;
  description: string;
  icon: string;
  onUpdate: (fields: { name?: string; description?: string; icon?: string }) => void;
}

export function SpaceHeader({ name, description, icon, onUpdate }: SpaceHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDesc, setEditDesc] = useState(description);
  const [editIcon, setEditIcon] = useState(icon);

  const handleSave = () => {
    onUpdate({ name: editName, description: editDesc, icon: editIcon });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-muted">
          <span className="hover:underline cursor-default">Spaces</span>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={editIcon}
            onChange={(e) => setEditIcon(e.target.value)}
            className="w-12 h-12 text-center text-2xl rounded-xl bg-surface-2 border border-border focus:outline-none focus:ring-2 focus:ring-accent/20"
            maxLength={2}
          />
          <div className="flex-1 space-y-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-xl font-semibold bg-surface-2 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Add a description..."
              className="w-full text-sm text-muted bg-surface-2 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={handleSave}
            className="p-2 rounded-lg bg-accent text-white hover:brightness-90 transition-all cursor-pointer"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted">
        <span className="hover:underline cursor-default">Spaces</span>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-3 group">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{name}</h1>
          {description && (
            <p className="text-sm text-muted truncate">{description}</p>
          )}
        </div>
        <button
          onClick={() => {
            setEditName(name);
            setEditDesc(description);
            setEditIcon(icon);
            setEditing(true);
          }}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
