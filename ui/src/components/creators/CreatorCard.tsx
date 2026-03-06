"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarColor(channelId: string): string {
  return AVATAR_COLORS[hashString(channelId) % AVATAR_COLORS.length];
}

function getStatusDot(lastCheckedAt?: string): {
  color: string;
  label: string;
} {
  if (!lastCheckedAt) {
    return { color: "bg-gray-400", label: "Never checked" };
  }

  const now = Date.now();
  const checked = new Date(lastCheckedAt).getTime();
  const diffMs = now - checked;
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  if (diffMs < oneHour) {
    return { color: "bg-green-500", label: "Active" };
  }
  if (diffMs < oneDay) {
    return { color: "bg-amber-500", label: "Checked today" };
  }
  return { color: "bg-gray-400", label: "Stale" };
}

interface Creator {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  lastCheckedAt?: string;
}

interface CreatorCardProps {
  creator: Creator;
  onDelete: (id: string) => void;
}

export function CreatorCard({ creator, onDelete }: CreatorCardProps) {
  const avatarColor = getAvatarColor(creator.channelId);
  const initial = creator.channelName.charAt(0).toUpperCase();
  const status = getStatusDot(creator.lastCheckedAt);

  return (
    <Card className="flex items-center gap-4">
      {/* Avatar */}
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}
      >
        {initial}
      </div>

      {/* Creator info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{creator.channelName}</h3>
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${status.color}`}
            title={status.label}
          />
        </div>
        <a
          href={creator.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors duration-300 truncate"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{creator.channelUrl}</span>
        </a>
        {creator.lastCheckedAt && (
          <p className="text-xs text-muted">
            Last checked: {timeAgo(creator.lastCheckedAt)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onDelete(creator.id)}>
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </Button>
      </div>
    </Card>
  );
}
