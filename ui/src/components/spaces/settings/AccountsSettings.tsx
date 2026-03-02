"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SpacePanelModal } from "../SpacePanelModal";

interface Account {
  id: string;
  platform: string;
  name: string;
}

interface AccountsSettingsProps {
  open: boolean;
  onClose: () => void;
  accounts: string[];
  onUpdateAccounts: (accounts: string[]) => void;
}

const platformColors: Record<string, string> = {
  tiktok: "bg-pink-500/20 text-pink-400",
  youtube: "bg-red-500/20 text-red-400",
  instagram: "bg-purple-500/20 text-purple-400",
  facebook: "bg-blue-500/20 text-blue-400",
};

export function AccountsSettings({
  open,
  onClose,
  accounts,
  onUpdateAccounts,
}: AccountsSettingsProps) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAllAccounts(data.accounts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    if (accounts.includes(id)) {
      onUpdateAccounts(accounts.filter((a) => a !== id));
    } else {
      onUpdateAccounts([...accounts, id]);
    }
  };

  return (
    <SpacePanelModal open={open} onClose={onClose} title="Space Accounts" size="sm">
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : allAccounts.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            No connected accounts found. Connect accounts in global Settings first.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted mb-2">
              Select which accounts to use in this space.
            </p>
            {allAccounts.map((acct) => (
              <label
                key={acct.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2/50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={accounts.includes(acct.id)}
                  onChange={() => toggle(acct.id)}
                  className="accent-[var(--color-accent)]"
                />
                <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${platformColors[acct.platform] ?? "bg-surface-2 text-muted"}`}>
                  {acct.platform}
                </span>
                <span className="text-sm">{acct.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </SpacePanelModal>
  );
}
