"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TransactionSchema, TransactionFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { addTransaction, updateAccount as updateAccountInDB, updateTransaction as updateTransactionInDB } from '@/lib/db';
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
  const accounts = useStore((state) => state.accounts);
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
      exchangeRate: transaction.exchangeRate,
    } : {
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD for input type="date"
    }
  });

  const transactionType = watch('type');
  const fromAccountId = watch('fromAccountId');
  const toAccountId = watch('accountId');
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

      // 4. Save Transaction
      if (transaction) {
        // Update existing transaction - clean undefined values
        const cleanData = Object.fromEntries(
          Object.entries(newTransaction).filter(([_, v]) => v !== undefined)
        );
        await updateTransactionInDB(transaction.id, cleanData);
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
          >
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
            <option value="TRANSFER">Transferencia</option>
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
        />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {transactionType === 'INCOME' ? 'Fuente de Ingreso' : 'Categoría'}
        </label>
        <select 
          {...register('categoryId')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{transactionType === 'INCOME' ? 'Seleccionar fuente' : 'Sin categoría'}</option>
          {transactionType === 'INCOME' 
            ? INCOME_SOURCES.map(src => (
                <option key={src.id} value={src.id}>{src.icon} {src.name}</option>
              ))
            : TRANSACTION_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))
          }
        </select>
      </div>

      {transactionType === 'TRANSFER' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde (Origen)</label>
              <select 
                {...register('fromAccountId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                ))}
              </select>
              {errors.fromAccountId && <p className="text-xs text-red-500">{errors.fromAccountId.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hacia (Destino)</label>
              <select 
                {...register('accountId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
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
          <label className="text-sm font-medium">Cuenta</label>
          <select 
            {...register('accountId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Seleccionar cuenta</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
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
        />
        {errors.date && <p className="text-xs text-red-500">{errors.date.message as string}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || hasError}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {transaction ? 'Actualizar Transacción' : transactionType === 'TRANSFER' ? 'Transferir' : 'Guardar Transacción'}
      </Button>
    </form>
  );
};
