"use client";

import React from "react";
import { Wand2 } from "lucide-react";
import { PILLARS, PillarSplit, fillSplit, monthKey, splitTotal } from "@/lib/pillars";
import { subtractMoney } from "@/lib/utils";

interface IncomeSplitEditorProps {
  amount: number;
  symbol?: string; // currency symbol of the income
  value?: PillarSplit;
  onChange: (split: PillarSplit) => void;
  // Optional "cuenta para": the month this income's split counts for (defaults to the month it was received)
  date?: Date;
  month?: string;
  onMonthChange?: (month: string | undefined) => void;
}

// The user decides how much of an income goes to each pillar; nothing is split automatically
export const IncomeSplitEditor: React.FC<IncomeSplitEditorProps> = ({ amount, symbol = "S/", value, onChange, date, month, onMonthChange }) => {
  const split = value || {};
  const left = subtractMoney(amount, splitTotal(split));

  return (
    <div className="space-y-3">
      {date && onMonthChange && (
        <div className="flex items-center gap-3">
          <label htmlFor="split-month" className="text-sm font-medium">Cuenta para</label>
          <input
            id="split-month"
            type="month"
            value={month ?? monthKey(date)}
            onChange={(e) => onMonthChange(!e.target.value || e.target.value === monthKey(date) ? undefined : e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="split-month-input"
          />
          <span className="text-xs text-muted-foreground">
            Recibido: {date.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Repartir en pilares</span>
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
      <div className="grid grid-cols-2 gap-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <label
              key={p.id}
              htmlFor={`split-${p.id}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 focus-within:ring-2 focus-within:ring-ring"
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${p.color}26`, color: p.color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-muted-foreground">{p.name}</span>
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
                  className="w-full bg-transparent text-sm font-semibold tabular-nums outline-none"
                  data-testid={`split-input-${p.id}`}
                />
              </span>
            </label>
          );
        })}
      </div>
      <p className={`text-right text-xs tabular-nums ${left < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        {left < 0 ? `Te pasaste por ${symbol} ${Math.abs(left).toFixed(2)}` : `Sin repartir: ${symbol} ${left.toFixed(2)}`}
      </p>
    </div>
  );
};
