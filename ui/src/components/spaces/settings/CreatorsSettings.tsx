"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SpacePanelModal } from "../SpacePanelModal";

interface Creator {
  id: string;
  channelName: string;
  channelUrl: string;
}

interface CreatorsSettingsProps {
  open: boolean;
  onClose: () => void;
  creators: string[];
  onUpdateCreators: (creators: string[]) => void;
}

export function CreatorsSettings({
  open,
  onClose,
  creators,
  onUpdateCreators,
}: CreatorsSettingsProps) {
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/creators")
      .then((r) => r.json())
      .then((data) => setAllCreators(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    if (creators.includes(id)) {
      onUpdateCreators(creators.filter((c) => c !== id));
    } else {
      onUpdateCreators([...creators, id]);
    }
  };

  return (
    <SpacePanelModal open={open} onClose={onClose} title="Space Creators" size="sm">
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : allCreators.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            No saved creators found. Add creators from the Creators tab first.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted mb-2">
              Select which creators to auto-clip in this space.
            </p>
            {allCreators.map((creator) => (
              <label
                key={creator.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2/50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={creators.includes(creator.id)}
                  onChange={() => toggle(creator.id)}
                  className="accent-[var(--color-accent)]"
                />
                <div className="min-w-0">
                  <div className="text-sm truncate">{creator.channelName}</div>
                  <div className="text-[10px] text-muted truncate">{creator.channelUrl}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </SpacePanelModal>
  );
}
