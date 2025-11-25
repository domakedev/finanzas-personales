"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard';
import { RecentTransactionsList } from '@/components/dashboard/RecentTransactionsList';
import { CategorySpendingBar } from '@/components/dashboard/CategorySpendingBar';
import { SavingsTree } from '@/components/SavingsTree';
import { 
  Wallet, CreditCard, TrendingUp, TrendingDown, DollarSign, 
  PiggyBank, AlertCircle, Target, Calendar 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { AccountForm } from '@/components/forms/AccountForm';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from '@/constants/categories';

export default function Dashboard() {
   const { user } = useAuth();
   const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
   const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

   const {
     accounts,
     transactions,
     debts,
     goals,
     currentBudget,
     categories
   } = useStore();

  // Calculate total balances
  const totalBalancePEN = accounts.filter(a => a.currency === 'PEN').reduce((sum, acc) => sum + acc.balance, 0);
  const totalBalanceUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, acc) => sum + acc.balance, 0);
  
  // Calculate total debts (excluding lent money)
  const totalDebtPEN = debts
    .filter(debt => !debt.isCreditCard && !debt.isLent && debt.currency === 'PEN')
    .reduce((sum, debt) => sum + (debt.totalAmount - (debt.paidAmount || 0)), 0);
  const totalCreditCardDebtPEN = debts
    .filter(debt => debt.isCreditCard && debt.currency === 'PEN')
    .reduce((sum, debt) => sum + (debt.totalAmount - (debt.paidAmount || 0)), 0);
  const totalCreditCardDebtUSD = debts
    .filter(debt => debt.isCreditCard && debt.currency === 'USD')
    .reduce((sum, debt) => sum + (debt.totalAmount - (debt.paidAmount || 0)), 0);
  
  const totalAllDebtPEN = totalDebtPEN + totalCreditCardDebtPEN;
  
  // Net Worth calculation
  const netWorthPEN = totalBalancePEN - totalAllDebtPEN;
  const netWorthUSD = totalBalanceUSD - totalCreditCardDebtUSD;
  
  // Current month calculations
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Date().toLocaleDateString('es-PE', { month: 'long' });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  
  const incomeMonth = transactions
    .filter(t => t.type === 'INCOME' && t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseMonth = transactions
    .filter(t => t.type === 'EXPENSE' && t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cashFlow = incomeMonth - expenseMonth;
  const savingsRate = incomeMonth > 0 ? ((incomeMonth - expenseMonth) / incomeMonth) * 100 : 0;
  
  // Budget health
  const budgetHealth = currentBudget && currentBudget.totalIncome > 0
    ? (expenseMonth / currentBudget.totalIncome) * 100
    : null;
  
  // Credit card payment proximity
  const creditCards = debts.filter(d => d.isCreditCard && d.paymentDate);
  const getNextPaymentInfo = () => {
    if (creditCards.length === 0) return null;
    
    const today = new Date();
    const nextPayments = creditCards.map(card => {
      const paymentDay = card.paymentDate!;
      let paymentDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
      
      if (paymentDate < today) {
        paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
      }
      
      const daysUntil = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        card: card.name,
        daysUntil,
        date: paymentDate
      };
    });
    
    nextPayments.sort((a, b) => a.daysUntil - b.daysUntil);
    return nextPayments[0];
  };
  
  const nextPayment = getNextPaymentInfo();
  
  // Category spending
  const categorySpending = (() => {
    // Get all categories that have spending in current month
    const categoriesWithSpending = new Map<string, number>();

    transactions
      .filter(t =>
        t.type === 'EXPENSE' &&
        t.date.getMonth() === currentMonth &&
        t.date.getFullYear() === currentYear &&
        t.categoryId
      )
      .forEach(t => {
        const current = categoriesWithSpending.get(t.categoryId!) || 0;
        categoriesWithSpending.set(t.categoryId!, current + t.amount);
      });

    // Convert to array with category info
    return Array.from(categoriesWithSpending.entries()).map(([categoryId, spent]) => {
      const category = categories.find(c => c.id === categoryId) ||
                      [...TRANSACTION_CATEGORIES, ...INCOME_SOURCES].find(c => c.id === categoryId);

      return {
        categoryId,
        categoryName: category?.name || 'Sin categoría',
        categoryIcon: category?.icon || '📦',
        spent
      };
    }).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);
  })();

  const totalExpenses = categorySpending.reduce((sum, cat) => sum + cat.spent, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tu Panorama Financiero</h2>
            <p className="text-muted-foreground">{monthNameCapitalized} {currentYear}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsTransactionModalOpen(true)}>Nueva Transacción</Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickStatsCard
            title="Patrimonio Neto"
            amount={netWorthUSD > 0 
              ? `S/ ${netWorthPEN.toFixed(2)} + $ ${netWorthUSD.toFixed(2)}`
              : `S/ ${netWorthPEN.toFixed(2)}`}
            icon={Wallet}
            subtitle="Balance - Deudas"
            colorScheme={netWorthPEN >= 0 ? 'success' : 'danger'}
          />
          
          <QuickStatsCard
            title="Flujo de Caja"
            amount={`S/ ${cashFlow.toFixed(2)}`}
            icon={cashFlow >= 0 ? TrendingUp : TrendingDown}
            subtitle={`Ingresos - Gastos (${monthNameCapitalized})`}
            colorScheme={cashFlow >= 0 ? 'success' : 'danger'}
          />
          
          {budgetHealth !== null ? (
            <QuickStatsCard
              title="Salud de Presupuesto"
              amount={`${budgetHealth.toFixed(0)}%`}
              icon={PiggyBank}
              subtitle={budgetHealth > 100 ? 'Excedido' : 'del presupuesto usado'}
              colorScheme={budgetHealth > 100 ? 'danger' : budgetHealth > 80 ? 'warning' : 'success'}
            />
          ) : (
            <QuickStatsCard
              title="Salud de Presupuesto"
              amount="N/A"
              icon={PiggyBank}
              subtitle="Sin presupuesto activo"
            />
          )}
          
          {nextPayment ? (
            <QuickStatsCard
              title="Próximo Pago TC"
              amount={`${nextPayment.daysUntil} ${nextPayment.daysUntil === 1 ? 'día' : 'días'}`}
              icon={Calendar}
              subtitle={nextPayment.card}
              colorScheme={
                nextPayment.daysUntil <= 3 ? 'danger' : 
                nextPayment.daysUntil <= 7 ? 'warning' : 
                'success'
              }
            />
          ) : (
            <QuickStatsCard
              title="Tasa de Ahorro"
              amount={`${savingsRate.toFixed(0)}%`}
              icon={Target}
              subtitle="de tus ingresos"
              colorScheme={savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'warning' : 'default'}
            />
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Transactions */}
          <Card className="col-span-full lg:col-span-4">
            <CardHeader>
              <CardTitle>Tus Últimos Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTransactionsList 
                transactions={transactions}
                categories={categories}
              />
            </CardContent>
          </Card>

          {/* Goals Summary */}
          <Card className="col-span-full lg:col-span-3">
            <CardHeader>
              <CardTitle>Metas de Ahorro</CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">Aún no has creado metas de ahorro. ¡Empecemos con tu primera meta!</p>
                  <Button onClick={() => window.location.href = '/goals'} variant="outline">
                    Crear meta
                  </Button>
                </div>
              ) : goals.length === 1 ? (
                <div className="flex flex-col items-center">
                  <SavingsTree percentage={(goals[0].currentAmount / goals[0].targetAmount) * 100} />
                  <div className="mt-4 text-center w-full">
                    <p className="font-semibold mb-1">{goals[0].name}</p>
                    <p className="text-xl font-bold">
                      S/ {goals[0].currentAmount.toFixed(2)} / S/ {goals[0].targetAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {goals[0].currentAmount >= goals[0].targetAmount 
                        ? '🎉 ¡Meta alcanzada!' 
                        : `Faltan S/ ${(goals[0].targetAmount - goals[0].currentAmount).toFixed(2)}`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map(goal => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-muted-foreground">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>S/ {goal.currentAmount.toFixed(2)}</span>
                          <span>S/ {goal.targetAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Spending */}
        {categorySpending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría ({monthNameCapitalized})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorySpending.slice(0, 10).map((cat) => (
                  <CategorySpendingBar
                    key={cat.categoryId}
                    categoryName={cat.categoryName}
                    categoryIcon={cat.categoryIcon}
                    spent={cat.spent}
                    total={totalExpenses}
                  />
                ))}
                {categorySpending.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{categorySpending.length - 10} categorías más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accounts Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-4">Conecta tu primera cuenta y empieza a visualizar todo tu dinero en un solo lugar.</p>
                <Button onClick={() => setIsAccountModalOpen(true)}>Crear mi primera cuenta</Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="p-4 border rounded-lg hover:bg-accent/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.type === 'BANK' ? 'Banco' : acc.type === 'WALLET' ? 'Billetera' : 'Efectivo'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">
                      {acc.currency === 'USD' ? '$' : 'S/'} {acc.balance.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
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
    </Layout>
  );
}
