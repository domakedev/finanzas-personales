"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TransactionSchema, TransactionFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { addTransaction, updateAccount as updateAccountInDB, updateTransaction as updateTransactionInDB, updateDebt as updateDebtInDB, updateGoal as updateGoalInDB } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { Transaction } from '@/types';
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from '@/constants/categories';

interface TransactionFormProps {
  onSuccess: () => void;
  onRequestCreateAccount?: () => void;
  transaction?: Transaction; // For editing
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSuccess, onRequestCreateAccount, transaction }) => {
  const { user: authUser } = useAuth();
  const user = useStore((state) => state.user) || authUser;
  const addTransactionToStore = useStore((state) => state.addTransaction);
  const updateAccount = useStore((state) => state.updateAccount);
  const updateTransaction = useStore((state) => state.updateTransaction);
  const updateDebt = useStore((state) => state.updateDebt);
  const updateGoal = useStore((state) => state.updateGoal);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const debts = useStore((state) => state.debts);
  const goals = useStore((state) => state.goals);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [needsExchangeRate, setNeedsExchangeRate] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(TransactionSchema),
    defaultValues: transaction ? {
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date instanceof Date
        ? transaction.date.toISOString().split('T')[0]
        : new Date(transaction.date).toISOString().split('T')[0],
      accountId: transaction.accountId,
      fromAccountId: transaction.fromAccountId,
      categoryId: transaction.categoryId,
      debtId: transaction.debtId,
      goalId: transaction.goalId,
      exchangeRate: transaction.exchangeRate,
    } : {
      type: 'EXPENSE' as const,
      date: (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(), // Format YYYY-MM-DD for input type="date" using local date
    }
  });

  const transactionType = watch('type');
  const fromAccountId = watch('fromAccountId');
  const toAccountId = watch('accountId');
  const debtId = watch('debtId');
  const goalId = watch('goalId');
  const amount = watch('amount') as number;
  const exchangeRate = watch('exchangeRate') as number;

  // Check if exchange rate is needed
  useEffect(() => {
    if (transactionType === 'TRANSFER' && fromAccountId && toAccountId) {
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const toAccount = accounts.find(a => a.id === toAccountId);
      
      if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
        setNeedsExchangeRate(true);
      } else {
        setNeedsExchangeRate(false);
        setValue('exchangeRate', undefined);
      }
    } else {
      setNeedsExchangeRate(false);
    }
  }, [transactionType, fromAccountId, toAccountId, accounts, setValue]);

  if (accounts.length === 0) {
    return (
      <div className="text-center py-6 space-y-4">
        <p className="text-muted-foreground">No tienes cuentas registradas para asociar a esta transacción.</p>
        <Button onClick={onRequestCreateAccount} className="w-full">
          Crear mi primera cuenta
        </Button>
      </div>
    );
  }

  const validateBalanceAndAccounts = (data: TransactionFormData): string | null => {
    // Validate EXPENSE
    if (data.type === 'EXPENSE') {
      const account = accounts.find(a => a.id === data.accountId);
      if (!account) return "La cuenta seleccionada no existe";
      if (account.balance < data.amount) {
        return `Saldo insuficiente. Disponible: ${account.currency === 'USD' ? '$' : 'S/'} ${account.balance.toFixed(2)}`;
      }
    }

    // Validate TRANSFER
    if (data.type === 'TRANSFER') {
      if (!data.fromAccountId) return "Debes seleccionar la cuenta de origen";
      if (data.fromAccountId === data.accountId) return "No puedes transferir a la misma cuenta";
      
      const fromAccount = accounts.find(a => a.id === data.fromAccountId);
      const toAccount = accounts.find(a => a.id === data.accountId);
      
      if (!fromAccount) return "La cuenta de origen no existe";
      if (!toAccount) return "La cuenta de destino no existe";
      if (fromAccount.balance < data.amount) {
        return `Saldo insuficiente en ${fromAccount.name}. Disponible: ${fromAccount.currency === 'USD' ? '$' : 'S/'} ${fromAccount.balance.toFixed(2)}`;
      }
      
      // Check if exchange rate is needed
      if (fromAccount.currency !== toAccount.currency && !data.exchangeRate) {
        return "Debes ingresar la tasa de conversión para transferencias entre monedas diferentes";
      }
    }

    // Validate PAY_DEBT
    if (data.type === 'PAY_DEBT') {
      if (!data.debtId) return "Debes seleccionar una deuda";

      const debt = debts.find(d => d.id === data.debtId && !d.isCreditCard);
      const account = accounts.find(a => a.id === data.accountId);

      if (!account) return "La cuenta seleccionada no existe";

      if (debt) {
        const remainingDebt = debt.totalAmount - (debt.paidAmount || 0);
        if (remainingDebt <= 0) return "Esta deuda ya está completamente pagada";
        if (data.amount > remainingDebt) {
          return `El monto excede la deuda restante. Máximo: ${debt.currency === 'USD' ? '$' : 'S/'} ${remainingDebt.toFixed(2)}`;
        }
      } else {
        // Debt doesn't exist, but allow the transaction (it will be orphaned)
        // Could show a warning, but for now just allow
      }

      if (account.balance < data.amount) {
        return `Saldo insuficiente. Disponible: ${account.currency === 'USD' ? '$' : 'S/'} ${account.balance.toFixed(2)}`;
      }
    }

    // Validate PAY_CREDIT_CARD
    if (data.type === 'PAY_CREDIT_CARD') {
      if (!data.debtId) return "Debes seleccionar una tarjeta de crédito";

      const creditCard = debts.find(d => d.id === data.debtId && d.isCreditCard);
      const account = accounts.find(a => a.id === data.accountId);

      if (!account) return "La cuenta seleccionada no existe";

      if (creditCard) {
        const remainingDebt = creditCard.totalAmount - (creditCard.paidAmount || 0);
        if (remainingDebt <= 0) return "Esta tarjeta de crédito ya está completamente pagada";
        if (data.amount > remainingDebt) {
          return `El monto excede la deuda restante. Máximo: ${creditCard.currency === 'USD' ? '$' : 'S/'} ${remainingDebt.toFixed(2)}`;
        }
      } else {
        // Credit card doesn't exist, but allow the transaction (it will be orphaned)
        // Could show a warning, but for now just allow
      }

      if (account.balance < data.amount) {
        return `Saldo insuficiente. Disponible: ${account.currency === 'USD' ? '$' : 'S/'} ${account.balance.toFixed(2)}`;
      }
    }

    // Validate SAVE_FOR_GOAL
    if (data.type === 'SAVE_FOR_GOAL') {
      if (!data.goalId) return "Debes seleccionar una meta";

      const goal = goals.find(g => g.id === data.goalId);
      const account = accounts.find(a => a.id === data.accountId);

      if (!account) return "La cuenta seleccionada no existe";

      if (goal) {
        const remainingGoal = goal.targetAmount - goal.currentAmount;
        if (remainingGoal <= 0) return "Esta meta ya está completamente alcanzada";
        if (data.amount > remainingGoal) {
          return `El monto excede la meta restante. Máximo: ${goal.currency === 'USD' ? '$' : 'S/'} ${remainingGoal.toFixed(2)}`;
        }
      } else {
        // Goal doesn't exist, but allow the transaction (it will be orphaned)
        // Could show a warning, but for now just allow
      }

      if (account.balance < data.amount) {
        return `Saldo insuficiente. Disponible: ${account.currency === 'USD' ? '$' : 'S/'} ${account.balance.toFixed(2)}`;
      }
    }

    return null;
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!user) return;
    
    setValidationError(null);
    
    // Validate
    const error = validateBalanceAndAccounts(data);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    
    // Store old balances for rollback
    const oldBalances = new Map<string, number>();
    accounts.forEach(acc => oldBalances.set(acc.id, acc.balance));

    try {
      const newTransaction: Partial<Transaction> = {
        ...data,
        // Note: id will be generated by Firebase for new transactions
        // For edits, we handle it separately below
      };

      // Remove undefined fields (Firebase doesn't accept them)
      if (!data.categoryId) delete newTransaction.categoryId;
      if (!data.debtId) delete newTransaction.debtId;
      if (!data.goalId) delete newTransaction.goalId;
      if (!data.exchangeRate) delete newTransaction.exchangeRate;

      // Calculate converted amount for cross-currency transfers
      if (data.type === 'TRANSFER' && data.fromAccountId) {
        const fromAccount = accounts.find(a => a.id === data.fromAccountId);
        const toAccount = accounts.find(a => a.id === data.accountId);
        
        if (fromAccount && toAccount) {
          newTransaction.fromCurrency = fromAccount.currency;
          newTransaction.toCurrency = toAccount.currency;
          
          if (fromAccount.currency !== toAccount.currency && data.exchangeRate) {
            newTransaction.convertedAmount = data.amount * data.exchangeRate;
          }
        }
      }

      // Helper to update account balance
      const updateBalance = async (accountId: string, amountChange: number) => {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return;
        
        // If we have a pending update in our local map (from a previous step in this same submit), use it
        // Otherwise use the store balance
        // Actually, since we are doing sequential updates, we should always fetch the latest from store or keep a running map
        // For simplicity, let's just update the store and DB immediately for each step
        // But we need to be careful about the 'account' reference being stale if we do multiple updates to same account
        
        // Better approach: Calculate net changes for each account and apply once
      };

      // We will track net balance changes for each account
      const balanceChanges = new Map<string, number>();
      const getChange = (id: string) => balanceChanges.get(id) || 0;
      const addChange = (id: string, amount: number) => balanceChanges.set(id, getChange(id) + amount);

      // 1. If editing, REVERT original transaction effects
      if (transaction) {
        if (transaction.type === 'EXPENSE') {
          addChange(transaction.accountId, transaction.amount);
        } else if (transaction.type === 'INCOME') {
          addChange(transaction.accountId, -transaction.amount);
        } else if (transaction.type === 'TRANSFER' && transaction.fromAccountId) {
          addChange(transaction.fromAccountId, transaction.amount);
          // For destination, add back the amount (or converted amount)
          const amountToRevert = transaction.convertedAmount || transaction.amount;
          addChange(transaction.accountId, -amountToRevert);
        } else if (transaction.type === 'PAY_DEBT') {
          addChange(transaction.accountId, transaction.amount);
        } else if (transaction.type === 'SAVE_FOR_GOAL') {
          addChange(transaction.accountId, transaction.amount);
        }
      }

      // 2. Apply NEW transaction effects
      if (data.type === 'EXPENSE') {
        addChange(data.accountId, -data.amount);
      } else if (data.type === 'INCOME') {
        addChange(data.accountId, data.amount);
      } else if (data.type === 'TRANSFER' && data.fromAccountId) {
        addChange(data.fromAccountId, -data.amount);
        const amountToAdd = newTransaction.convertedAmount || data.amount;
        addChange(data.accountId, amountToAdd);
      } else if (data.type === 'PAY_DEBT') {
        addChange(data.accountId, -data.amount);
      } else if (data.type === 'PAY_CREDIT_CARD') {
        addChange(data.accountId, -data.amount);
      } else if (data.type === 'SAVE_FOR_GOAL') {
        addChange(data.accountId, -data.amount);
      }

      // 3. Apply all balance changes
      for (const [accountId, change] of balanceChanges.entries()) {
        if (change === 0) continue;
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) continue;

        const newBalance = account.balance + change;
        
        // Update Store
        updateAccount(accountId, { balance: newBalance });
        // Update DB
        await updateAccountInDB(accountId, { balance: newBalance });
      }

      // 4. Update Debt if this is a debt payment
      if (data.type === 'PAY_DEBT' && data.debtId) {
        const debt = debts.find(d => d.id === data.debtId && !d.isCreditCard);
        if (debt) {
          let newPaidAmount = debt.paidAmount || 0;

          // If editing, revert the old payment first
          if (transaction && transaction.type === 'PAY_DEBT' && transaction.debtId === data.debtId) {
            newPaidAmount = Math.max(0, Math.round((newPaidAmount - transaction.amount) * 100) / 100);
          }

          // Apply the new payment
          newPaidAmount = Math.round((newPaidAmount + data.amount) * 100) / 100;

          // Update both store and DB
          updateDebt(data.debtId, { paidAmount: newPaidAmount });
          await updateDebtInDB(data.debtId, { paidAmount: newPaidAmount });
        }
        // If debt doesn't exist, don't update paidAmount (transaction becomes orphaned)
      } else if (data.type === 'PAY_CREDIT_CARD' && data.debtId) {
        const creditCard = debts.find(d => d.id === data.debtId && d.isCreditCard);
        if (creditCard) {
          let newPaidAmount = creditCard.paidAmount || 0;

          // If editing, revert the old payment first
          if (transaction && transaction.type === 'PAY_CREDIT_CARD' && transaction.debtId === data.debtId) {
            newPaidAmount = Math.max(0, Math.round((newPaidAmount - transaction.amount) * 100) / 100);
          }

          // Apply the new payment
          newPaidAmount = Math.round((newPaidAmount + data.amount) * 100) / 100;

          // Update both store and DB
          updateDebt(data.debtId, { paidAmount: newPaidAmount });
          await updateDebtInDB(data.debtId, { paidAmount: newPaidAmount });
        }
        // If credit card doesn't exist, don't update paidAmount (transaction becomes orphaned)
      } else if (transaction && transaction.type === 'PAY_DEBT' && transaction.debtId) {
        // If editing and changing away from PAY_DEBT, revert the debt payment
        const debt = debts.find(d => d.id === transaction.debtId && !d.isCreditCard);
        if (debt) {
          const newPaidAmount = Math.max(0, Math.round(((debt.paidAmount || 0) - transaction.amount) * 100) / 100);
          updateDebt(transaction.debtId, { paidAmount: newPaidAmount });
          await updateDebtInDB(transaction.debtId, { paidAmount: newPaidAmount });
        }
        // If debt doesn't exist, can't revert (but that's ok, it was already orphaned)
      } else if (transaction && transaction.type === 'PAY_CREDIT_CARD' && transaction.debtId) {
        // If editing and changing away from PAY_CREDIT_CARD, revert the credit card payment
        const creditCard = debts.find(d => d.id === transaction.debtId && d.isCreditCard);
        if (creditCard) {
          const newPaidAmount = Math.max(0, Math.round(((creditCard.paidAmount || 0) - transaction.amount) * 100) / 100);
          updateDebt(transaction.debtId, { paidAmount: newPaidAmount });
          await updateDebtInDB(transaction.debtId, { paidAmount: newPaidAmount });
        }
        // If credit card doesn't exist, can't revert (but that's ok, it was already orphaned)
      }

      // 5. Update Goal if this is a goal saving
      if (data.type === 'SAVE_FOR_GOAL' && data.goalId) {
        const goal = goals.find(g => g.id === data.goalId);
        if (goal) {
          let newCurrentAmount = goal.currentAmount;

          // If editing, revert the old saving first
          if (transaction && transaction.type === 'SAVE_FOR_GOAL' && transaction.goalId === data.goalId) {
            newCurrentAmount = Math.max(0, Math.round((newCurrentAmount - transaction.amount) * 100) / 100);
          }

          // Apply the new saving
          newCurrentAmount = Math.round((newCurrentAmount + data.amount) * 100) / 100;

          // Update both store and DB
          updateGoal(data.goalId, { currentAmount: newCurrentAmount });
          await updateGoalInDB(data.goalId, { currentAmount: newCurrentAmount });
        }
        // If goal doesn't exist, don't update currentAmount (transaction becomes orphaned)
      } else if (transaction && transaction.type === 'SAVE_FOR_GOAL' && transaction.goalId) {
        // If editing and changing away from SAVE_FOR_GOAL, revert the goal saving
        const goal = goals.find(g => g.id === transaction.goalId);
        if (goal) {
          const newCurrentAmount = Math.max(0, Math.round((goal.currentAmount - transaction.amount) * 100) / 100);
          updateGoal(transaction.goalId, { currentAmount: newCurrentAmount });
          await updateGoalInDB(transaction.goalId, { currentAmount: newCurrentAmount });
        }
        // If goal doesn't exist, can't revert (but that's ok, it was already orphaned)
      }

      // 5. Save Transaction
      if (transaction) {
        // Update existing transaction - clean undefined values
        const cleanData = Object.fromEntries(
          Object.entries(newTransaction).filter(([_, v]) => v !== undefined)
        );
        await updateTransactionInDB(transaction.id, cleanData);
        updateTransaction(transaction.id, cleanData);
      } else {
        // Add new transaction - clean undefined values
        const cleanData = Object.fromEntries(
          Object.entries(newTransaction).filter(([_, v]) => v !== undefined)
        );
        // Remove the id field - Firestore generates its own
        delete cleanData.id;
        
        // Add to Firebase and get the real document ID
        const docRef = await addTransaction(user.uid, cleanData as unknown as Omit<Transaction, 'id'>);
        
        // Update the transaction with the real Firebase ID
        const transactionWithRealId = {
          ...newTransaction,
          id: docRef.id  // Use Firebase's generated ID
        } as Transaction;
        
        // Add to store with the correct ID
        addTransactionToStore(transactionWithRealId);
      }
      
      reset();
      onSuccess();
    } catch (error) {
      console.error("Error processing transaction:", error);
      setValidationError("Error al procesar la transacción. Inténtalo de nuevo.");
      
      // Rollback balances in Zustand
      oldBalances.forEach((balance, accountId) => {
        updateAccount(accountId, { balance });
      });
      // Note: We can't easily rollback DB changes here if they partially succeeded, 
      // but this is a best-effort rollback for UI consistency.
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = !!validationError;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{validationError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo</label>
          <select
            {...register('type')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="transaction-type-select"
          >
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="PAY_DEBT">Pagar Deuda</option>
            <option value="PAY_CREDIT_CARD">Pagar Tarjeta de Crédito</option>
            <option value="SAVE_FOR_GOAL">Ahorrar para Meta</option>
          </select>
          {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Monto</label>
          <input
            type="number"
            step="0.01"
            {...register('amount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="transaction-amount-input"
          />
          {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Descripción</label>
        <input
          type="text"
          {...register('description')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej: Almuerzo"
          data-testid="transaction-description-input"
        />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {transactionType !== 'PAY_DEBT' && transactionType !== 'SAVE_FOR_GOAL' && transactionType !== 'TRANSFER' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {transactionType === 'INCOME' ? 'Fuente de Ingreso' : 'Categoría'}
          </label>
          <select
            {...register('categoryId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="transaction-category-select"
          >
            <option value="">{transactionType === 'INCOME' ? 'Seleccionar fuente' : 'Sin categoría'}</option>
            {transactionType === 'INCOME' 
              ? [
                  ...INCOME_SOURCES,
                  ...categories.filter(c => c.type === 'INCOME')
                ].map(src => (
                  <option key={src.id} value={src.id}>{src.icon} {src.name}</option>
                ))
              : [
                  ...TRANSACTION_CATEGORIES,
                  ...categories.filter(c => c.type === 'EXPENSE')
                ].map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))
            }
          </select>
        </div>
      )}

      {transactionType === 'PAY_DEBT' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Deuda a Pagar</label>
          <select
            {...register('debtId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="transaction-debt-select"
          >
            <option value="">Seleccionar deuda</option>
            {debts.filter(debt => !debt.isCreditCard).map(debt => {
              const remaining = debt.totalAmount - (debt.paidAmount || 0);
              return (
                <option key={debt.id} value={debt.id}>
                  {debt.name} - Restante: {debt.currency === 'USD' ? '$' : 'S/'} {remaining.toFixed(2)}
                </option>
              );
            })}
          </select>
          {errors.debtId && <p className="text-xs text-red-500">{errors.debtId.message}</p>}
        </div>
      )}

      {transactionType === 'PAY_CREDIT_CARD' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tarjeta de Crédito a Pagar</label>
          <select
            {...register('debtId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="transaction-credit-card-select"
          >
            <option value="">Seleccionar tarjeta de crédito</option>
            {debts.filter(debt => debt.isCreditCard).map(debt => {
              const remaining = debt.totalAmount - (debt.paidAmount || 0);
              return (
                <option key={debt.id} value={debt.id}>
                  {debt.name} - Restante: {debt.currency === 'USD' ? '$' : 'S/'} {remaining.toFixed(2)}
                </option>
              );
            })}
          </select>
          {errors.debtId && <p className="text-xs text-red-500">{errors.debtId.message}</p>}
        </div>
      )}

      {transactionType === 'SAVE_FOR_GOAL' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Meta a Ahorrar</label>
          <select
            {...register('goalId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="transaction-goal-select"
          >
            <option value="">Seleccionar meta</option>
            {goals.map(goal => {
              const remaining = goal.targetAmount - goal.currentAmount;
              return (
                <option key={goal.id} value={goal.id}>
                  {goal.name} - Restante: {goal.currency === 'USD' ? '$' : 'S/'} {remaining.toFixed(2)}
                </option>
              );
            })}
          </select>
          {errors.goalId && <p className="text-xs text-red-500">{errors.goalId.message}</p>}
        </div>
      )}

      {transactionType === 'TRANSFER' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde (Origen)</label>
              <select
                {...register('fromAccountId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="transaction-from-account-select"
              >
                <option value="">Seleccionar cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) - Disp: {acc.currency === 'USD' ? '$' : 'S/'} {acc.balance.toFixed(2)}
                  </option>
                ))}
              </select>
              {errors.fromAccountId && <p className="text-xs text-red-500">{errors.fromAccountId.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hacia (Destino)</label>
              <select
                {...register('accountId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="transaction-to-account-select"
              >
                <option value="">Seleccionar cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) - Disp: {acc.currency === 'USD' ? '$' : 'S/'} {acc.balance.toFixed(2)}
                  </option>
                ))}
              </select>
              {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
            </div>
          </div>

          {needsExchangeRate && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Transferencia entre monedas diferentes</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tasa de Conversión</label>
                <input
                  type="number"
                  step="0.0001"
                  {...register('exchangeRate')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ej: 3.75"
                  data-testid="transaction-exchange-rate-input"
                />
                {errors.exchangeRate && <p className="text-xs text-red-500">{errors.exchangeRate.message}</p>}
                {amount && exchangeRate && (
                  <p className="text-xs text-muted-foreground">
                    Se transferirán {amount} → {(Number(amount) * Number(exchangeRate)).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {(transactionType === 'PAY_DEBT' || transactionType === 'SAVE_FOR_GOAL') ? 'Cuenta para ' + (transactionType === 'PAY_DEBT' ? 'Pagar' : 'Ahorrar') : 'Cuenta'}
          </label>
          <select
            {...register('accountId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="transaction-account-select"
          >
            <option value="">Seleccionar cuenta</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency}) - Disp: {acc.currency === 'USD' ? '$' : 'S/'} {acc.balance.toFixed(2)}
              </option>
            ))}
          </select>
          {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha</label>
        <input
          type="date"
          {...register('date')}
          max={new Date().toISOString().split('T')[0]}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="transaction-date-input"
        />
        {errors.date && <p className="text-xs text-red-500">{errors.date.message as string}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || hasError} data-testid="save-transaction-button">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {transaction ? 'Actualizar Transacción' :
          transactionType === 'TRANSFER' ? 'Transferir' :
          transactionType === 'PAY_DEBT' ? 'Pagar Deuda' :
          transactionType === 'PAY_CREDIT_CARD' ? 'Pagar Tarjeta de Crédito' :
          transactionType === 'SAVE_FOR_GOAL' ? 'Ahorrar para Meta' :
          'Guardar Transacción'}
      </Button>
    </form>
  );
};
