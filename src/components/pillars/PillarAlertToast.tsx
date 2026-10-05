"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { getPillar } from "@/lib/pillars";
import { cn } from "@/lib/utils";

const TONE_BORDER = {
  info: "border-border",
  success: "border-green-500",
  warning: "border-amber-500",
  danger: "border-red-500",
};

export const PillarAlertToast: React.FC = () => {
  const alert = useStore((s) => s.pillarAlert);
  const setPillarAlert = useStore((s) => s.setPillarAlert);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setPillarAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [alert, setPillarAlert]);

  if (!alert) return null;
  const meta = getPillar(alert.pillar);
  const Icon = meta?.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-24 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-xl border-2 bg-card p-3 shadow-lg animate-in fade-in slide-in-from-bottom-4",
        TONE_BORDER[alert.tone]
      )}
      data-testid="pillar-alert"
    >
      {meta && Icon && (
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{alert.title}</p>
        <p className="text-xs text-muted-foreground">{alert.detail}</p>
      </div>
      <button
        onClick={() => setPillarAlert(null)}
        className="rounded p-1 text-muted-foreground hover:bg-muted"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
