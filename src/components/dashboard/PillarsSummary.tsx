"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Transaction } from "@/types";
import { computeMonthPillars } from "@/lib/pillars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface PillarsSummaryProps {
  transactions: Transaction[];
  monthLabel: string;
}

export const PillarsSummary: React.FC<PillarsSummaryProps> = ({ transactions, monthLabel }) => {
  const now = new Date();
  const { assigned, pillars } = computeMonthPillars(transactions, now.getMonth(), now.getFullYear());

  return (
    <Link href="/pillars" className="block" data-testid="dashboard-pillars">
      <Card className="transition-colors hover:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Pilares · {monthLabel}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assigned <= 0 ? (
            <p className="text-sm text-muted-foreground">Reparte tus ingresos del mes en pilares para ver tu avance.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {pillars.map(({ meta, percent }) => {
                const Icon = meta.icon;
                const over = meta.kind === "limit" && percent > 100;
                const ringColor = over ? "#c0392b" : meta.color;
                return (
                  <div key={meta.id} className="flex flex-col items-center gap-1.5">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(${ringColor} 0 ${Math.min(percent, 100)}%, var(--muted) 0)` }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card" style={{ color: meta.color }}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${over ? "text-red-600 dark:text-red-400" : ""}`}>
                      {percent.toFixed(0)}%
                    </span>
                    <span className="text-center text-[11px] leading-tight text-muted-foreground">
                      {meta.name}
                      <span className="block font-semibold">{meta.percent}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
