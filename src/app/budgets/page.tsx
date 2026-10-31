"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Modal } from '@/components/ui/Modal';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { BudgetBar, BudgetPercent, budgetAmounts, PeriodBadge, StartBadge, useBudgetStatuses } from '@/components/budgets/BudgetBits';
import { useStore } from '@/lib/store';
import { deleteBudget as deleteBudgetInDB } from '@/lib/db';
import { PILLARS } from '@/lib/pillars';
import { cn } from '@/lib/utils';
import { Budget, Pillar } from '@/types';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export default function BudgetsPage() {
  const removeBudget = useStore((s) => s.removeBudget);
  const statuses = useBudgetStatuses();
  const [filter, setFilter] = useState<Pillar | 'ALL'>('ALL');
  const [form, setForm] = useState<{ budget?: Budget; pillar?: Pillar } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteBudgetInDB(id);
      removeBudget(id);
      setConfirmId(null);
    } catch (error) {
      console.error('Error deleting budget:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const filters = [
    { id: 'ALL' as const, name: 'Todos', color: undefined, count: statuses.length },
    ...PILLARS.map((p) => ({ id: p.id, name: p.name, color: p.color, count: statuses.filter((s) => s.budget.pillar === p.id).length })),
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <button
            onClick={() => setForm({})}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
            data-testid="new-budget"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>

        <div role="group" aria-label="Filtrar por pilar" className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold',
                filter === f.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:bg-muted'
              )}
            >
              {f.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />}
              {f.name}
              <span className="font-medium opacity-75">{f.count}</span>
            </button>
          ))}
        </div>

        {PILLARS.filter((p) => filter === 'ALL' || filter === p.id).map((p) => {
          const rows = statuses.filter((s) => s.budget.pillar === p.id);
          return (
            <section key={p.id} aria-label={p.name} className="space-y-1.5">
              <h2 className="flex items-center gap-2 px-0.5 py-1 text-[15px] font-bold">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                {p.name}
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {rows.map((s) => {
                  const b = s.budget;
                  return (
                    <div key={b.id} className={cn('border-b border-border', s.ended && 'opacity-60')} data-testid={`budget-row-${b.id}`}>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 pl-4 pr-2">
                        <div className="flex min-w-0 flex-[1_1_180px] items-center gap-2">
                          <span className="truncate font-semibold">{b.name}</span>
                          <PeriodBadge budget={b} />
                          {s.upcoming && <StartBadge budget={b} />}
                          {s.ended && <span className="text-xs text-muted-foreground">terminó</span>}
                        </div>
                        <div className="flex min-w-0 flex-[2_1_220px] items-center gap-3">
                          <BudgetBar status={s} className="flex-1" />
                          <span className="w-28 text-right text-sm tabular-nums text-muted-foreground">{budgetAmounts(s)}</span>
                          <BudgetPercent status={s} className="w-14 text-sm" />
                        </div>
                        <div className="flex">
                          <button
                            onClick={() => setForm({ budget: b })}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Editar ${b.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmId(b.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-600"
                            aria-label={`Eliminar ${b.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {confirmId === b.id && (
                        <div className="flex justify-end gap-2 px-3 pb-3">
                          <button
                            onClick={() => setConfirmId(null)}
                            className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => remove(b.id)}
                            disabled={deletingId === b.id}
                            className="h-9 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setForm({ pillar: p.id })}
                  className="flex h-11 w-full items-center gap-1.5 px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
                  aria-label={`Nuevo presupuesto en ${p.name}`}
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        isOpen={form !== null}
        onClose={() => setForm(null)}
        title={form?.budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      >
        {form && <BudgetForm budget={form.budget} pillar={form.pillar} onDone={() => setForm(null)} />}
      </Modal>
    </Layout>
  );
}
