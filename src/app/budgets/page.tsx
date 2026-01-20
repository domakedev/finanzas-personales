"use client"

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { saveBudget, getBudget } from '@/lib/db';
import { Budget } from '@/types';
import { TRANSACTION_CATEGORIES } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

export default function BudgetsPage() {
  const { user } = useAuth();
  const { currentBudget, setCurrentBudget, transactions, categories } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; categoryId: string | null }>({
    isOpen: false,
    categoryId: null,
  });

  // Form state
  const [income, setIncome] = useState<string>('');
  const [limits, setLimits] = useState<Record<string, string>>({});

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Initialize state from store
  useEffect(() => {
    if (currentBudget) {
      setIncome(currentBudget.totalIncome.toString());
      const limitsStr: Record<string, string> = {};
      Object.entries(currentBudget.categoryLimits).forEach(([k, v]) => {
        limitsStr[k] = v.toString();
      });
      setLimits(limitsStr);
    }
  }, [currentBudget]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const limitsNum: Record<string, number> = {};
      Object.entries(limits).forEach(([k, v]) => {
        if (v) limitsNum[k] = parseFloat(v);
      });

      const budgetData: Omit<Budget, 'id' | 'userId'> = {
        month: currentMonth,
        year: currentYear,
        totalIncome: parseFloat(income) || currentBudget?.totalIncome || 0,
        categoryLimits: limitsNum
      };

      await saveBudget(user.uid, budgetData);

      // Reload to get the ID if it was new and update store
      const updatedBudget = await getBudget(user.uid, currentMonth, currentYear);
      setCurrentBudget(updatedBudget);

    } catch (error) {
      console.error("Error saving budget:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = (categoryId: string) => {
    setLimits(prev => ({ ...prev, [categoryId]: '0' }));
    setIsAddModalOpen(false);
  };

  const handleDeleteCategory = () => {
    if (deleteConfirm.categoryId) {
      const newLimits = { ...limits };
      delete newLimits[deleteConfirm.categoryId];
      setLimits(newLimits);
      setDeleteConfirm({ isOpen: false, categoryId: null });
    }
  };

  const calculateSpent = (categoryId: string) => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.categoryId === categoryId &&
          t.type === 'EXPENSE' &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'EXPENSE' &&
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear;
  });

  const totalSpent = monthlyTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  // Calculate historical average income from last 6 months
  const calculateHistoricalIncomeAverage = () => {
    const now = new Date();
    const months = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: date.getMonth(), year: date.getFullYear() });
    }

    const monthlyIncomes = months.map(({ month, year }) => {
      return transactions
        .filter(t => (t.type === 'INCOME' || t.type === 'RECEIVE_DEBT_PAYMENT') &&
          t.date.getMonth() === month && t.date.getFullYear() === year)
        .reduce((sum, t) => sum + t.amount, 0);
    }).filter(income => income > 0); // Only months with income

    if (monthlyIncomes.length === 0) return 0;
    return monthlyIncomes.reduce((sum, inc) => sum + inc, 0) / monthlyIncomes.length;
  };

  const historicalIncomeAverage = calculateHistoricalIncomeAverage();
  const incomeNum = parseFloat(income) || 0;
  const remainingIncome = historicalIncomeAverage - totalSpent;

  // Filter available categories to add
  const availableCategories = [...TRANSACTION_CATEGORIES, ...categories.filter(c => c.type === 'EXPENSE')]
    .filter(cat => !Object.keys(limits).includes(cat.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Check for changes
  const hasChanges = React.useMemo(() => {
    const initialIncome = currentBudget?.totalIncome || 0;
    const currentIncomeNum = parseFloat(income) || 0;

    // Compare income (allow small float differences if needed, but strict equality is usually fine for user input)
    if (Math.abs(currentIncomeNum - initialIncome) > 0.01) return true;

    const initialLimits = currentBudget?.categoryLimits || {};
    const currentLimitKeys = Object.keys(limits);
    const initialLimitKeys = Object.keys(initialLimits);

    // If number of categories changed
    if (currentLimitKeys.length !== initialLimitKeys.length) return true;

    // Check each category limit
    for (const key of currentLimitKeys) {
      const currentVal = parseFloat(limits[key]) || 0;
      const initialVal = initialLimits[key] || 0;
      if (Math.abs(currentVal - initialVal) > 0.01) return true;
    }

    return false;
  }, [income, limits, currentBudget]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Presupuesto Mensual</h1>
            <p className="text-muted-foreground">
              {currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={!hasChanges ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" : ""}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>

        {/* Income Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Ingresos</h2>
          {currentBudget && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Presupuesto guardado</div>
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                Ingreso esperado: S/ {currentBudget.totalIncome.toFixed(2)}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Definir ingreso mensual esperado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-md border border-input bg-background"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex-1 p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Disponible para gastar (según tu historial)</div>
              <div className={cn("text-2xl font-bold", remainingIncome < 0 ? "text-red-500" : "text-green-600")}>
                S/ {remainingIncome.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Ingresos - Gastos</div>
            </div>
          </div>
        </Card>

        {/* Categories Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Categorías Presupuestadas</h2>
            <Button onClick={() => setIsAddModalOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Agregar Categoría
            </Button>
          </div>

          <div className="grid gap-6">
            {Object.keys(limits).length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No hay categorías en este presupuesto. Agrega una para comenzar.
              </div>
            )}

            {Object.keys(limits).map((categoryId) => {
              // Find category in system or custom categories
              const category = [...TRANSACTION_CATEGORIES, ...categories].find(c => c.id === categoryId);

              // Handle case where category might have been deleted but still in budget
              if (!category) return null;

              const limit = parseFloat(limits[categoryId]) || 0;
              const spent = calculateSpent(categoryId);
              const percentage = limit > 0 ? (spent / limit) * 100 : 0;
              const remaining = limit - spent;

              let statusColor = "bg-green-500";
              if (percentage > 100) statusColor = "bg-red-500";
              else if (percentage > 80) statusColor = "bg-yellow-500";

              return (
                <Card key={categoryId} className="p-4 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteConfirm({ isOpen: true, categoryId })}
                    title="Quitar del presupuesto"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start pr-10">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          <div className="text-sm text-muted-foreground">
                            Gastado: S/ {spent.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium mb-1">Límite</div>
                        <div className="relative w-32">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S/</span>
                          <input
                            type="number"
                            value={limits[categoryId]}
                            onChange={(e) => setLimits(prev => ({ ...prev, [categoryId]: e.target.value }))}
                            className="w-full pl-6 pr-2 py-1 text-sm rounded-md border border-input bg-background text-right"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {limit > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={cn(
                            percentage > 100 ? "text-red-500 font-bold" : "text-muted-foreground"
                          )}>
                            {percentage.toFixed(0)}%
                          </span>
                          <span className={cn(
                            remaining < 0 ? "text-red-500 font-bold" : "text-muted-foreground"
                          )}>
                            {remaining < 0 ? `Excedido por S/ ${Math.abs(remaining).toFixed(2)}` : `Quedan S/ ${remaining.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-500", statusColor)}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Add Category Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Agregar Categoría al Presupuesto"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {availableCategories.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No hay más categorías disponibles para agregar.
              </div>
            ) : (
              availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleAddCategory(cat.id)}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border hover:bg-accent hover:text-accent-foreground transition-colors gap-2 cursor-pointer"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-center">{cat.name}</span>
                </button>
              ))
            )}
          </div>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, categoryId: null })}
          onConfirm={handleDeleteCategory}
          title="Quitar Categoría"
          message="¿Estás seguro de quitar esta categoría del presupuesto? El límite establecido se perderá, pero tus transacciones no se verán afectadas."
          confirmText="Quitar"
          isDestructive={true}
        />
      </div>
    </Layout>
  );
}
