"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { ChevronLeft, ChevronRight, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useStore } from '@/lib/store';
import { updateTransaction as updateTransactionInDB } from '@/lib/db';
import { computeMonthPillars, PILLARS } from '@/lib/pillars';
import { Pillar } from '@/types';

export default function PillarsPage() {
  const transactions = useStore((s) => s.transactions);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [openPillar, setOpenPillar] = useState<Pillar | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { income, pillars, unassigned } = computeMonthPillars(transactions, cursor.month, cursor.year);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ month: d.getMonth(), year: d.getFullYear() });
    setOpenPillar(null);
  };

  const assignPillar = async (txId: string, pillar: Pillar) => {
    setSavingId(txId);
    try {
      await updateTransactionInDB(txId, { pillar });
      updateTransaction(txId, { pillar });
    } catch (error) {
      console.error('Error assigning pillar:', error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="rounded-full p-2 hover:bg-muted" aria-label="Mes anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold capitalize">{monthLabel}</h2>
            <p className="text-sm text-muted-foreground tabular-nums">Ingresos S/ {income.toFixed(2)}</p>
          </div>
          <button onClick={() => shiftMonth(1)} className="rounded-full p-2 hover:bg-muted" aria-label="Mes siguiente">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {income <= 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Aún no hay ingresos este mes. Las metas de cada pilar se calculan sobre lo que ingresa.
            </CardContent>
          </Card>
        )}

        {pillars.map(({ meta, target, spent, percent, transactions: txs }) => {
          const Icon = meta.icon;
          const over = meta.kind === 'limit' && percent > 100;
          const done = meta.kind === 'goal' && percent >= 100;
          const isOpen = openPillar === meta.id;
          return (
            <Card key={meta.id} data-testid={`pillar-card-${meta.id}`}>
              <button
                className="w-full p-4 text-left"
                onClick={() => setOpenPillar(isOpen ? null : meta.id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {meta.name} <span className="text-xs font-normal text-muted-foreground">{meta.percent}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{meta.kind === 'goal' ? 'Meta' : 'Límite'}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className={`font-semibold ${over ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {done && <Check className="mr-1 inline h-4 w-4 text-green-600" />}
                      {spent.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">/ {target.toFixed(2)}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className="relative mt-3 h-2 rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: over ? '#c0392b' : meta.color }}
                  />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 pb-3">
                  {txs.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">Sin movimientos este mes.</p>
                  ) : (
                    txs
                      .slice()
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .map((tx) => (
                        <div key={tx.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
                          <span className="flex-1 truncate">{tx.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {tx.date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="w-20 text-right tabular-nums">{tx.amount.toFixed(2)}</span>
                        </div>
                      ))
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {unassigned.length > 0 && (
          <Card className="border-amber-300 dark:border-amber-800">
            <CardContent className="space-y-3 pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                {unassigned.length} gasto{unassigned.length > 1 ? 's' : ''} sin pilar
              </p>
              {unassigned.map((tx) => (
                <div key={tx.id} className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{tx.description}</span>
                  <span className="tabular-nums">{tx.amount.toFixed(2)}</span>
                  <div className="flex gap-1">
                    {PILLARS.map((p) => {
                      const PIcon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => assignPillar(tx.id, p.id)}
                          disabled={savingId === tx.id}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-50"
                          style={{ color: p.color }}
                          aria-label={`Asignar a ${p.name}`}
                          title={p.name}
                        >
                          <PIcon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
