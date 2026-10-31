"use client";

import React from "react";
import { monthKey } from "@/lib/pillars";

interface PillarMonthInputProps {
  date: Date; // when the movement happened
  month?: string; // 'YYYY-MM' it counts for in Pilares; undefined = its own month
  onChange: (month: string | undefined) => void;
}

// "Cuenta para": lets a movement count for another month in Pilares (e.g. salary paid on the 30th)
export const PillarMonthInput: React.FC<PillarMonthInputProps> = ({ date, month, onChange }) => (
  <div className="flex items-center gap-3">
    <label htmlFor="pillar-month" className="text-sm font-medium">Cuenta para</label>
    <input
      id="pillar-month"
      type="month"
      value={month ?? monthKey(date)}
      onChange={(e) => onChange(!e.target.value || e.target.value === monthKey(date) ? undefined : e.target.value)}
      className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="split-month-input"
    />
    <span className="text-xs text-muted-foreground">
      Fecha: {date.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
    </span>
  </div>
);
