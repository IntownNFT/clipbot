"use client";

import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export function BillingTab() {
  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="rounded-full bg-surface-2 p-4">
          <CreditCard className="h-8 w-8 text-muted" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Billing & Usage
        </h2>
        <p className="text-sm text-muted text-center max-w-md">
          Usage tracking, API cost breakdowns, and subscription management
          are coming soon. For now, all features are available at no charge
          beyond your own API keys.
        </p>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          Coming Soon
        </span>
      </Card>
    </div>
  );
}
