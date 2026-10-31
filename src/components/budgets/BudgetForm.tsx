"use client";

import React, { useState } from "react";
import { Bell, Plus, Repeat } from "lucide-react";
import { deleteField } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { TRANSACTION_CATEGORIES } from "@/constants/categories";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { addBudget as addBudgetInDB, updateBudget as updateBudgetInDB } from "@/lib/db";
import { addDays, BUDGET_ALERT_LEVELS, BUDGET_PERIODS, fmtAmount, monthlyEquivalent, startOfDay, windowContaining } from "@/lib/budgets";
import { CATEGORY_PILLAR, computeMonthPillars, getPillar, makeCurrencyOf, makeToPen, PILLARS } from "@/lib/pillars";
import { cn } from "@/lib/utils";
import { Budget, BudgetPeriod, Pillar } from "@/types";

const dayLabel = (d: Date) => d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });

const chipClass = (on: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
    on ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"
  );

interface BudgetFormProps {
  budget?: Budget; // edit
  pillar?: Pillar; // create from a pillar card
  onDone: () => void;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ budget, pillar: initialPillar, onDone }) => {
  const { user } = useAuth();
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const debts = useStore((s) => s.debts);
  const usdRate = useStore((s) => s.usdRate);
  const addBudget = useStore((s) => s.addBudget);
  const updateBudget = useStore((s) => s.updateBudget);

  const [pillar, setPillar] = useState<Pillar>(budget?.pillar ?? initialPillar ?? "REWARD");
  const [name, setName] = useState(budget?.name ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.amount) : "");
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? "WEEKLY");
  const [days, setDays] = useState(String(budget?.days ?? 10));
  const [repeat, setRepeat] = useState(budget?.repeat ?? false);
  const [categoryIds, setCategoryIds] = useState<string[]>(budget?.categoryIds ?? []);
  const [alerts, setAlerts] = useState<number[]>(budget?.alerts ?? BUDGET_ALERT_LEVELS);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const meta = getPillar(pillar)!;
  const value = Number(amount) || 0;
  const n = parseInt(days, 10) || 0;
  const startDate = budget?.startDate ?? startOfDay(now);

  // When this period ends / starts again, so "Repetir" is never ambiguous
  const current = windowContaining({ period, days: Math.max(1, n), startDate }, now);
  const hint = repeat
    ? `Vuelve a empezar el ${dayLabel(current.end)}`
    : `Termina el ${dayLabel(addDays(current.end, -1))} y no vuelve`;

  // Compare with what the pillar has this month
  const toPen = makeToPen(makeCurrencyOf(accounts, debts), usdRate);
  const target = computeMonthPillars(transactions, now.getMonth(), now.getFullYear(), toPen)
    .pillars.find((p) => p.meta.id === pillar)?.target ?? 0;
  const monthly = monthlyEquivalent(value, period, Math.max(1, n));
  const fit = target > 0 ? (monthly / target) * 100 : 0;

  // Existing expense categories: the ones the app suggests for this pillar first, the rest behind "Más"
  const allCategories = [
    ...TRANSACTION_CATEGORIES.filter((c) => c.id !== "salary"),
    ...categories.filter((c) => c.type === "EXPENSE"),
  ];
  const visible = showAll
    ? allCategories
    : allCategories.filter((c) => CATEGORY_PILLAR[c.id] === pillar || categoryIds.includes(c.id));
  const hiddenCount = allCategories.length - visible.length;

  const pickPillar = (id: Pillar) => {
    setPillar(id);
    setCategoryIds([]);
    setShowAll(false);
  };

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const toggleAlert = (level: number) =>
    setAlerts((ls) => (ls.includes(level) ? ls.filter((l) => l !== level) : [...ls, level].sort((a, b) => a - b)));

  const save = async () => {
    if (!user) return;
    if (!name.trim()) return setError("Ponle un nombre");
    if (value <= 0) return setError("Pon un límite mayor a 0");
    if (period === "CUSTOM" && n < 2) return setError("Mínimo 2 días");

    const base = { name: name.trim(), pillar, amount: value, period, repeat, categoryIds, alerts };
    const custom = period === "CUSTOM" ? { days: n } : {};
    setSaving(true);
    try {
      if (budget) {
        // A one-time budget runs for the period it is in now
        const start = repeat ? budget.startDate : windowContaining({ period, days: n, startDate: budget.startDate }, now).start;
        const patch = { ...base, ...custom, startDate: start };
        await updateBudgetInDB(budget.id, {
          ...patch,
          ...(period === "CUSTOM" ? {} : { days: deleteField() }),
        } as unknown as Partial<Budget>);
        updateBudget(budget.id, { ...patch, days: period === "CUSTOM" ? n : undefined });
      } else {
        const data: Omit<Budget, "id"> = { ...base, ...custom, startDate: startOfDay(now) };
        const ref = await addBudgetInDB(user.uid, data);
        addBudget({ id: ref.id, ...data });
      }
      onDone();
    } catch (err) {
      console.error("Error saving budget:", err);
      setError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Pilar" className="grid grid-cols-4 gap-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          const on = p.id === pillar;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => pickPillar(p.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 text-xs font-semibold transition-colors",
                !on && "border-border hover:bg-muted"
              )}
              style={on ? { borderColor: p.color, backgroundColor: `${p.color}1f` } : undefined}
            >
              <Icon className="h-5 w-5" style={{ color: p.color }} />
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          aria-label="Nombre"
          placeholder="Nombre"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-background px-3"
          data-testid="budget-name"
        />
        <label className="relative block w-32">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            aria-label="Límite"
            placeholder="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            className="h-12 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-lg font-semibold tabular-nums"
            data-testid="budget-amount"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <p id="budget-period" className="text-sm font-medium text-muted-foreground">Plazo para gastarlo</p>
        <div role="group" aria-labelledby="budget-period" className="flex rounded-xl bg-muted p-1">
          {BUDGET_PERIODS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === period}
              onClick={() => setPeriod(o.id)}
              className={cn(
                "h-9 flex-1 rounded-lg text-sm font-semibold transition-colors",
                o.id === period ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {period === "CUSTOM" && (
          <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
            <input
              type="number"
              min="2"
              max="365"
              aria-label="Días"
              value={days}
              onChange={(e) => { setDays(e.target.value); setError(null); }}
              className="h-9 w-16 rounded-lg border border-input bg-background text-center text-foreground"
            />
            días
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Repeat className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p id="budget-repeat" className="text-sm font-semibold">Repetir</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={repeat}
          aria-labelledby="budget-repeat"
          onClick={() => setRepeat(!repeat)}
          className={cn(
            "relative h-7 w-12 flex-shrink-0 rounded-full transition-colors",
            repeat ? "bg-primary" : "bg-muted-foreground/40"
          )}
          data-testid="budget-repeat"
        >
          <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", repeat ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>

      <div role="group" aria-label="Categorías" className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={categoryIds.length === 0} onClick={() => setCategoryIds([])} className={chipClass(categoryIds.length === 0)}>
          Todo
        </button>
        {visible.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={categoryIds.includes(c.id)}
            onClick={() => toggleCategory(c.id)}
            className={chipClass(categoryIds.includes(c.id))}
          >
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </button>
        ))}
        {hiddenCount > 0 && (
          <button type="button" onClick={() => setShowAll(true)} className={chipClass(false)}>
            <Plus className="h-3.5 w-3.5" /> Más
          </button>
        )}
      </div>

      <div role="group" aria-label="Avisos" className="flex items-center gap-1.5">
        <Bell className="mr-1 h-4 w-4 text-muted-foreground" />
        {BUDGET_ALERT_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={alerts.includes(l)}
            aria-label={`Avisar al ${l}%`}
            onClick={() => toggleAlert(l)}
            className={cn(chipClass(alerts.includes(l)), "font-semibold tabular-nums")}
          >
            {l}%
          </button>
        ))}
      </div>

      {value > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold tabular-nums">
              ≈ S/ {fmtAmount(Math.round(monthly))} <span className="font-normal text-muted-foreground">/ mes</span>
            </p>
            {target > 0 && (
              <div className="mt-1.5 h-1.5 rounded-full bg-border">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(fit, 100)}%`, backgroundColor: fit > 100 ? "#c0392b" : meta.color }}
                />
              </div>
            )}
          </div>
          {target > 0 && (
            <div className="text-right">
              <p className={cn("font-bold tabular-nums", fit > 100 && "text-red-600 dark:text-red-400")}>{Math.round(fit)}%</p>
              <p className="text-xs text-muted-foreground">de {meta.name}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Button className="h-12 w-full text-base" onClick={save} isLoading={saving} data-testid="budget-save">
        {budget ? "Guardar" : "Crear"}
      </Button>
    </div>
  );
};
