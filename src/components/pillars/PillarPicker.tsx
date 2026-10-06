"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Pillar } from "@/types";
import { PILLARS } from "@/lib/pillars";
import { cn } from "@/lib/utils";

interface PillarPickerProps {
  value?: Pillar;
  onChange: (pillar: Pillar | undefined) => void;
  suggested?: Pillar; // hint only, never preselected
  compact?: boolean;
}

export const PillarPicker: React.FC<PillarPickerProps> = ({ value, onChange, suggested, compact }) => (
  <div className="space-y-1">
    <div role="radiogroup" aria-label="Pilar" className="grid grid-cols-4 gap-2">
      {PILLARS.map((p) => {
        const selected = value === p.id;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? undefined : p.id)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-lg border-2 bg-card px-1 font-medium transition-colors",
              compact ? "py-1.5 text-[11px]" : "py-2.5 text-xs",
              !selected && "border-border hover:bg-muted"
            )}
            style={selected ? { borderColor: p.color, backgroundColor: `${p.color}1f` } : undefined}
            data-testid={`pillar-option-${p.id}`}
          >
            {suggested === p.id && !value && (
              <Sparkles className="absolute -top-2 -right-1.5 h-4 w-4 rounded-full bg-card text-violet-500" aria-label="Sugerido" />
            )}
            <span
              className={cn("flex items-center justify-center rounded-md", compact ? "h-6 w-6" : "h-8 w-8")}
              style={{ backgroundColor: `${p.color}26`, color: p.color }}
            >
              <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
            {p.name}
          </button>
        );
      })}
    </div>
    {value && (
      <button type="button" onClick={() => onChange(undefined)} className="text-xs text-muted-foreground underline">
        Quitar pilar
      </button>
    )}
  </div>
);
