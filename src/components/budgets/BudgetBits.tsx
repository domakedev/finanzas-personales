"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CalendarDays, Check, Repeat } from "lucide-react";
import { useStore } from "@/lib/store";
import { BudgetStatus, computeBudgetStatus, fmtAmount, periodLabel } from "@/lib/budgets";
import { getPillar, makeCurrencyOf, makeToPen } from "@/lib/pillars";
import { cn } from "@/lib/utils";
import { Budget } from "@/types";

// Current period of every budget, counted in soles like Pilares
export const useBudgetStatuses = (): BudgetStatus[] => {
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const debts = useStore((s) => s.debts);
  const usdRate = useStore((s) => s.usdRate);
  const toPen = makeToPen(makeCurrencyOf(accounts, debts), usdRate);
  return budgets
    .map((b) => computeBudgetStatus(b, transactions, toPen))
    .sort((a, b) => a.budget.name.localeCompare(b.budget.name));
};

export const budgetAmounts = (s: BudgetStatus) => `S/ ${fmtAmount(s.spent)} / ${fmtAmount(s.budget.amount)}`;

export const PeriodBadge: React.FC<{ budget: Budget }> = ({ budget }) => (
  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
    {budget.repeat && <Repeat className="h-3 w-3" role="img" aria-label="Se repite" />}
    {periodLabel(budget)}
  </span>
);

// Budgets planned ahead show the day they start
export const StartBadge: React.FC<{ budget: Budget }> = ({ budget }) => (
  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
    <CalendarDays className="h-3 w-3" role="img" aria-label="Empieza" />
    {budget.startDate.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
  </span>
);

const STATE_TEXT: Record<BudgetStatus["state"], string> = {
  ok: "text-muted-foreground",
  near: "text-amber-700 dark:text-amber-400",
  limit: "text-red-600 dark:text-red-400",
  over: "text-red-600 dark:text-red-400",
};

export const BudgetPercent: React.FC<{ status: BudgetStatus; className?: string }> = ({ status, className }) => (
  <span className={cn("inline-flex items-center justify-end gap-0.5 font-bold tabular-nums", STATE_TEXT[status.state], className)}>
    {status.state !== "ok" && <AlertTriangle className="h-3.5 w-3.5" />}
    {Math.round(status.percent)}%
  </span>
);

export const BudgetBar: React.FC<{ status: BudgetStatus; className?: string }> = ({ status, className }) => (
  <div className={cn("h-1.5 rounded-full bg-muted", className)}>
    <div
      className="h-full rounded-full"
      style={{
        width: `${Math.min(status.percent, 100)}%`,
        backgroundColor: status.state === "over" ? "#c0392b" : getPillar(status.budget.pillar)?.color,
      }}
    />
  </div>
);

// "Presupuestos ✓3 ⚠1 ⓘ1": how the running budgets are doing, good and bad
export const BudgetStatusLink: React.FC<{ statuses: BudgetStatus[] }> = ({ statuses }) => {
  const active = statuses.filter((s) => !s.ended && !s.upcoming);
  const ok = active.filter((s) => s.state === "ok").length;
  const near = active.filter((s) => s.state === "near").length;
  const over = active.length - ok - near;
  const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums";
  return (
    <Link
      href="/budgets"
      aria-label={`Presupuestos: ${ok} al día, ${near} cerca del límite, ${over} en el límite o excedidos`}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card py-1 pl-3.5 pr-2.5 text-sm font-semibold hover:bg-muted"
      data-testid="budgets-link"
    >
      <span className="pr-1">Presupuestos</span>
      {active.length > 0 && (
        <>
          <span title="Al día" className={cn(pill, "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300")}>
            <Check className="h-3 w-3" strokeWidth={3} /> {ok}
          </span>
          <span title="Cerca del límite" className={cn(pill, "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300")}>
            <AlertTriangle className="h-3 w-3" /> {near}
          </span>
          <span title="En el límite o excedidos" className={cn(pill, "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300")}>
            <AlertCircle className="h-3 w-3" /> {over}
          </span>
        </>
      )}
    </Link>
  );
};
