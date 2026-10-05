"use client";

import React from "react";
import { Wand2 } from "lucide-react";
import { PILLARS, PillarSplit, fillSplit, splitTotal } from "@/lib/pillars";
import { subtractMoney } from "@/lib/utils";

interface IncomeSplitEditorProps {
  amount: number;
  value?: PillarSplit;
  onChange: (split: PillarSplit) => void;
}

// The user decides how much of an income goes to each pillar; nothing is split automatically
export const IncomeSplitEditor: React.FC<IncomeSplitEditorProps> = ({ amount, value, onChange }) => {
  const split = value || {};
  const left = subtractMoney(amount, splitTotal(split));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Repartir en pilares</label>
        <button
          type="button"
          onClick={() => onChange(fillSplit(amount))}
          disabled={amount <= 0}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted disabled:opacity-50"
          data-testid="fill-split-button"
        >
          <Wand2 className="h-3.5 w-3.5" /> Llenar 25/15/50/10
        </button>
      </div>
      {PILLARS.map((p) => {
        const Icon = p.icon;
        return (
          <div key={p.id} className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${p.color}26`, color: p.color }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <label htmlFor={`split-${p.id}`} className="flex-1 text-sm">{p.name}</label>
            <input
              id={`split-${p.id}`}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={split[p.id] ?? ""}
              onChange={(e) => {
                // Empty input removes the key so the schema never sees undefined values
                const { [p.id]: _removed, ...rest } = split;
                onChange(e.target.value === "" ? rest : { ...rest, [p.id]: Number(e.target.value) });
              }}
              placeholder="0.00"
              className="h-9 w-28 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`split-input-${p.id}`}
            />
          </div>
        );
      })}
      <p className={`text-right text-xs tabular-nums ${left < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        {left < 0 ? `Te pasaste por S/ ${Math.abs(left).toFixed(2)}` : `Sin repartir: S/ ${left.toFixed(2)}`}
      </p>
    </div>
  );
};
