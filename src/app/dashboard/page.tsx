"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { SavingsTree } from '@/components/SavingsTree';
import { Wallet, CreditCard, TrendingUp, DollarSign, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { AccountForm } from '@/components/forms/AccountForm';
import { LoadingFinance } from '@/components/ui/LoadingFinance';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from '@/constants/categories';

export default function Dashboard() {
   const { user } = useAuth();
   const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
   const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
   const [detailModal, setDetailModal] = useState<{
     isOpen: boolean;
     type: 'balance' | 'debt' | 'income' | 'expense' | null;
     currency?: 'PEN' | 'USD';
   }>({ isOpen: false, type: null });

   const {
     accounts,
     transactions,
     debts,
     goals
   } = useStore();

  // Separar cuentas por moneda
  const accountsPEN = accounts.filter(a => a.currency === 'PEN');
  const accountsUSD = accounts.filter(a => a.currency === 'USD');
  
  const totalBalancePEN = accountsPEN.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBalanceUSD = accountsUSD.reduce((sum, acc) => sum + acc.balance, 0);
  
  const totalDebt = debts.reduce((sum, debt) => sum + (debt.totalAmount - debt.paidAmount), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Date().toLocaleDateString('es-PE', { month: 'long' });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  
  const incomeTransactions = transactions.filter(t => 
    t.type === 'INCOME' && 
    t.date.getMonth() === currentMonth &&
    t.date.getFullYear() === currentYear
  );
  const incomeMonth = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    
  const expenseTransactions = transactions.filter(t => 
    t.type === 'EXPENSE' && 
    t.date.getMonth() === currentMonth &&
    t.date.getFullYear() === currentYear
  );
  const expenseMonth = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  const openDetailModal = (type: typeof detailModal.type, currency?: 'PEN' | 'USD') => {
    setDetailModal({ isOpen: true, type, currency });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsTransactionModalOpen(true)}>Nueva Transacción</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => openDetailModal('balance', 'PEN')} className="cursor-pointer">
            <SummaryCard 
              title="Saldo Total (S/)" 
              amount={`S/ ${totalBalancePEN.toFixed(2)}`} 
              icon={Wallet} 
            />
          </div>
          <div onClick={() => openDetailModal('balance', 'USD')} className="cursor-pointer">
            <SummaryCard 
              title="Saldo Total ($)" 
              amount={`$ ${totalBalanceUSD.toFixed(2)}`} 
              icon={Wallet} 
            />
          </div>
          <div onClick={() => openDetailModal('debt')} className="cursor-pointer">
            <SummaryCard 
              title="Deuda Total" 
              amount={`S/ ${totalDebt.toFixed(2)}`} 
              icon={CreditCard} 
            />
          </div>
          <div onClick={() => openDetailModal('income')} className="cursor-pointer">
            <SummaryCard 
              title={`Ingresos (${monthNameCapitalized})`} 
              amount={`S/ ${incomeMonth.toFixed(2)}`} 
              icon={DollarSign} 
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => openDetailModal('expense')} className="cursor-pointer">
            <SummaryCard 
              title={`Gastos (${monthNameCapitalized})`} 
              amount={`S/ ${expenseMonth.toFixed(2)}`} 
              icon={TrendingUp} 
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Resumen de Cuentas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm mb-4">No hay cuentas registradas.</p>
                    <Button onClick={() => setIsAccountModalOpen(true)}>Crear mi primera cuenta</Button>
                  </div>
                ) : (
                  accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{acc.name}</p>
                        <p className="text-sm text-muted-foreground">{acc.type}</p>
                      </div>
                      <div className="font-bold">
                        {acc.currency === 'USD' ? '$' : 'S/'} {acc.balance.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>
                {goals.length > 0 ? goals[0].name : 'Metas de Ahorro'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {goals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">No tienes metas de ahorro.</p>
                  <Button onClick={() => window.location.href = '/goals'}>Crear meta</Button>
                </div>
              ) : (
                <>
                  <SavingsTree percentage={(goals[0].currentAmount / goals[0].targetAmount) * 100} />
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold">
                      S/ {goals[0].currentAmount.toFixed(2)} / S/ {goals[0].targetAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {goals[0].currentAmount >= goals[0].targetAmount 
                        ? '¡Meta alcanzada! 🎉' 
                        : `Faltan S/ ${(goals[0].targetAmount - goals[0].currentAmount).toFixed(2)}`
                      }
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)}
        title="Agregar Transacción"
      >
        <TransactionForm 
          onSuccess={() => setIsTransactionModalOpen(false)} 
          onRequestCreateAccount={() => {
            setIsTransactionModalOpen(false);
            setIsAccountModalOpen(true);
          }}
        />
      </Modal>

      <Modal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)}
        title="Nueva Cuenta"
      >
        <AccountForm onSuccess={() => setIsAccountModalOpen(false)} />
      </Modal>

      {/* Modal de Detalles */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, type: null })}
        title={
          detailModal.type === 'balance' ? `Detalle de Saldo (${detailModal.currency})` :
          detailModal.type === 'debt' ? 'Detalle de Deudas' :
          detailModal.type === 'income' ? `Detalle de Ingresos (${monthNameCapitalized})` :
          detailModal.type === 'expense' ? `Detalle de Gastos (${monthNameCapitalized})` : ''
        }
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {detailModal.type === 'balance' && detailModal.currency && (
            <>
              {accounts
                .filter(a => a.currency === detailModal.currency)
                .map(acc => (
                  <div key={acc.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.type}</p>
                    </div>
                    <p className="font-bold">{acc.currency === 'USD' ? '$' : 'S/'} {acc.balance.toFixed(2)}</p>
                  </div>
                ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <p className="font-semibold">Total:</p>
                  <p className="text-xl font-bold">
                    {detailModal.currency === 'USD' ? '$' : 'S/'} {(detailModal.currency === 'USD' ? totalBalanceUSD : totalBalancePEN).toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}

          {detailModal.type === 'debt' && (
            <>
              {debts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tienes deudas registradas.</p>
              ) : (
                <>
                  {debts.map(debt => (
                    <div key={debt.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">{debt.name}</p>
                        <p className="font-bold text-red-600">S/ {(debt.totalAmount - debt.paidAmount).toFixed(2)}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pagado: S/ {debt.paidAmount.toFixed(2)} de S/ {debt.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Total Pendiente:</p>
                      <p className="text-xl font-bold text-red-600">S/ {totalDebt.toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {detailModal.type === 'income' && (
            <>
              {incomeTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay ingresos este mes.</p>
              ) : (
                <>
                  {incomeTransactions.map(tx => (
                    <div key={tx.id} className="p-3 border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('es-PE')}</p>
                        {tx.categoryId && (
                          <p className="text-[10px] text-muted-foreground">
                            {(() => {
                              const allCategories = [...TRANSACTION_CATEGORIES, ...INCOME_SOURCES, ...useStore.getState().categories];
                              const category = allCategories.find(c => c.id === tx.categoryId);
                              return category ? category.name : <span className="text-red-400 italic">Categoría eliminada</span>;
                            })()}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-green-600">+S/ {tx.amount.toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Total Ingresos:</p>
                      <p className="text-xl font-bold text-green-600">S/ {incomeMonth.toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {detailModal.type === 'expense' && (
            <>
              {expenseTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay gastos este mes.</p>
              ) : (
                <>
                  {expenseTransactions.map(tx => (
                    <div key={tx.id} className="p-3 border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('es-PE')}</p>
                        {tx.categoryId && (
                          <p className="text-[10px] text-muted-foreground">
                            {(() => {
                              const allCategories = [...TRANSACTION_CATEGORIES, ...INCOME_SOURCES, ...useStore.getState().categories];
                              const category = allCategories.find(c => c.id === tx.categoryId);
                              return category ? category.name : <span className="text-red-400 italic">Categoría eliminada</span>;
                            })()}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-red-600">-S/ {tx.amount.toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Total Gastos:</p>
                      <p className="text-xl font-bold text-red-600">S/ {expenseMonth.toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
