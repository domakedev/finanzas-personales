"use client"

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { applyBalanceAdjustments, BalanceAdjustment } from '@/lib/db';
import { addMoney, subtractMoney } from '@/lib/utils';
import { Account, Transaction } from '@/types';
import { format, differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, RefreshCw, ArrowRight, Wallet, Loader2 } from 'lucide-react';

const symbol = (currency: Account['currency']) => (currency === 'USD' ? '$' : 'S/');

export default function CatchUpPage() {
  const { user: authUser } = useAuth();
  const user = useStore((s) => s.user) || authUser;
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const addTransactionToStore = useStore((s) => s.addTransaction);
  const updateAccountInStore = useStore((s) => s.updateAccount);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [dateInput, setDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Transaction[] | null>(null);

  // How long since the user last recorded anything (excluding previous adjustments)
  const lastRealTx = useMemo(() => {
    const real = transactions.filter((t) => !t.isAdjustment);
    if (real.length === 0) return null;
    return real.reduce((max, t) => (t.date > max ? t.date : max), real[0].date);
  }, [transactions]);
  const daysAway = lastRealTx ? differenceInCalendarDays(new Date(), lastRealTx) : null;

  // One row per account: what the app thinks, what the bank says, and the gap
  const rows = useMemo(
    () =>
      accounts.map((account) => {
        const raw = inputs[account.id] ?? '';
        const real = raw === '' ? NaN : parseFloat(raw);
        const difference = isNaN(real) ? null : subtractMoney(real, account.balance);
        return { account, raw, real, difference };
      }),
    [accounts, inputs]
  );

  const pending = rows.filter((r) => r.difference !== null && r.difference !== 0);
  const matched = rows.filter((r) => r.difference === 0);

  const totalBy = (currency: Account['currency']) =>
    pending
      .filter((r) => r.account.currency === currency)
      .reduce((sum, r) => addMoney(sum, r.difference!), 0);
  const totalPEN = totalBy('PEN');
  const totalUSD = totalBy('USD');

  const adjustDate = new Date(`${dateInput}T12:00:00`);
  const adjustDateLabel = isNaN(adjustDate.getTime()) ? '' : format(adjustDate, 'dd/MM/yyyy');

  const handleApply = async () => {
    if (!user || pending.length === 0 || isNaN(adjustDate.getTime())) return;
    setConfirmOpen(false);
    setIsSaving(true);
    setError(null);

    const label = `Ajuste por reconciliación (hasta ${adjustDateLabel})`;

    const adjustments: BalanceAdjustment[] = pending.map(({ account, real, difference }) => {
      const isIncome = difference! > 0;
      return {
        accountId: account.id,
        newBalance: real,
        transaction: {
          amount: Math.abs(difference!),
          description: label,
          date: adjustDate,
          createdAt: new Date(),
          type: isIncome ? 'INCOME' : 'EXPENSE',
          categoryId: isIncome ? 'other-income' : 'other',
          accountId: account.id,
          isVerified: true,
          isAdjustment: true,
        },
      };
    });

    try {
      const created = await applyBalanceAdjustments(user.uid, adjustments);
      created.forEach((tx) => addTransactionToStore(tx));
      adjustments.forEach((adj) => updateAccountInStore(adj.accountId, { balance: adj.newBalance }));
      setDone(created);
      setInputs({});
    } catch (e) {
      console.error('Error applying adjustments:', e);
      setError('No se pudieron guardar los ajustes. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderLogo = (account: Account) =>
    account.logo ? (
      <Image src={account.logo} alt={account.name} width={28} height={28} className="object-contain" />
    ) : (
      <span className="text-xl">{account.icon || '💵'}</span>
    );

  if (done) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">¡Estás al día!</h2>
              <p className="text-muted-foreground">
                Se {done.length === 1 ? 'creó 1 ajuste' : `crearon ${done.length} ajustes`} y tus saldos ya coinciden con el banco.
                Los ajustes quedan marcados como &quot;Ajuste por reconciliación&quot; en el flujo: si algún día tienes ganas,
                puedes borrarlos y registrar los gastos reales de ese período.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href="/dashboard"><Button>Ir al dashboard</Button></Link>
                <Link href="/transactions"><Button variant="outline">Ver ajustes en el flujo</Button></Link>
                <Button variant="ghost" onClick={() => setDone(null)}>Ajustar otra cuenta</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <RefreshCw className="h-7 w-7 text-primary" /> Ponerme al día
          </h2>
          <p className="text-muted-foreground mt-1">
            {daysAway === null
              ? 'Aún no tienes movimientos registrados.'
              : daysAway === 0
                ? 'Registraste movimientos hoy. Aun así puedes verificar que tus saldos coincidan.'
                : `Tu último movimiento registrado fue hace ${daysAway} ${daysAway === 1 ? 'día' : 'días'} (${format(lastRealTx!, 'dd/MM/yyyy')}).`}
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-sm space-y-1">
            <p className="font-medium">No necesitas registrar cada gasto para volver a tener el panorama correcto.</p>
            <p className="text-muted-foreground">
              Abre la app de cada banco o billetera, copia el saldo que ves y escríbelo abajo. La diferencia con lo que la app
              tenía se guarda como un solo ajuste por cuenta. En dos minutos tu patrimonio vuelve a ser real.
            </p>
          </CardContent>
        </Card>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Todavía no tienes cuentas. Crea una primero.</p>
              <Link href="/accounts"><Button variant="outline">Ir a Cuentas</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <CardTitle className="text-lg">Tus cuentas</CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="adjust-date" className="text-muted-foreground whitespace-nowrap">Fecha del ajuste</label>
                    <input
                      id="adjust-date"
                      type="date"
                      value={dateInput}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {rows.map(({ account, raw, difference }) => (
                  <div
                    key={account.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 md:gap-6 items-center p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        {renderLogo(account)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          En la app: {symbol(account.currency)} {account.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="md:w-48">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {symbol(account.currency)}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={raw}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [account.id]: e.target.value }))}
                          placeholder="Saldo real"
                          aria-label={`Saldo real de ${account.name}`}
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="md:w-44 text-sm">
                      {difference === null ? (
                        <span className="text-muted-foreground">Sin cambios</span>
                      ) : difference === 0 ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Coincide
                        </span>
                      ) : (
                        <div>
                          <span className={`font-semibold ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {difference > 0 ? '+' : '-'} {symbol(account.currency)} {Math.abs(difference).toFixed(2)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {difference > 0 ? 'Ingresos sin registrar' : 'Gastos sin registrar'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="hidden md:block w-5">
                      {difference !== null && difference !== 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm space-y-1">
                  {pending.length === 0 ? (
                    <p className="text-muted-foreground">
                      {matched.length > 0
                        ? 'Todo coincide. No hay nada que ajustar.'
                        : 'Escribe el saldo real de al menos una cuenta para ver la diferencia.'}
                    </p>
                  ) : (
                    <>
                      <p className="font-medium">
                        {pending.length === 1 ? '1 cuenta por ajustar' : `${pending.length} cuentas por ajustar`}
                        {matched.length > 0 && <span className="text-muted-foreground"> · {matched.length} ya coinciden</span>}
                      </p>
                      <p className="text-muted-foreground">
                        Diferencia neta:
                        {totalPEN !== 0 && <span className="ml-1">S/ {totalPEN > 0 ? '+' : ''}{totalPEN.toFixed(2)}</span>}
                        {totalUSD !== 0 && <span className="ml-2">$ {totalUSD > 0 ? '+' : ''}{totalUSD.toFixed(2)}</span>}
                      </p>
                    </>
                  )}
                  {error && <p className="text-red-600">{error}</p>}
                </div>
                <Button
                  size="lg"
                  disabled={pending.length === 0 || isSaving || !adjustDateLabel}
                  onClick={() => setConfirmOpen(true)}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {pending.length <= 1 ? 'Ajustar saldo' : `Ajustar ${pending.length} cuentas`}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleApply}
        title="Confirmar ajustes"
        message={`Se creará un ajuste por cada una de las ${pending.length} ${pending.length === 1 ? 'cuenta' : 'cuentas'} con diferencia, con fecha ${adjustDateLabel}, y sus saldos pasarán a ser los que escribiste. Podrás borrar cualquier ajuste después desde el flujo.`}
        confirmText="Sí, ponerme al día"
      />
    </Layout>
  );
}
