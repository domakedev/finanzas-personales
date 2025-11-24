"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DebtSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { addDebt, updateDebt } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { Debt } from '@/types';

interface DebtFormProps {
  onSuccess: () => void;
  debt?: Debt;
  isLent?: boolean;
}

export const DebtForm: React.FC<DebtFormProps> = ({ onSuccess, debt, isLent = false }) => {
  const { user } = useAuth();
  const addDebtToStore = useStore((state) => state.addDebt);
  const updateDebtInStore = useStore((state) => state.updateDebt);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(DebtSchema),
    defaultValues: {
      name: debt?.name || '',
      totalAmount: debt?.totalAmount || 0,
      paidAmount: debt?.paidAmount || 0,
      currency: debt?.currency || 'PEN',
      dueDate: debt?.dueDate ? (debt.dueDate instanceof Date ? debt.dueDate.toISOString().split('T')[0] : new Date(debt.dueDate).toISOString().split('T')[0]) : undefined,
      isLent: debt?.isLent ?? isLent,
    }
  });

  const paidAmount = Number(watch('paidAmount')) || 0;
  const totalAmount = Number(watch('totalAmount')) || 0;
  const isExceeded = paidAmount > totalAmount && totalAmount > 0;

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Handle optional dueDate - remove if empty
      const debtData = { ...data };
      if (!debtData.dueDate || debtData.dueDate === '') {
        delete debtData.dueDate;
      }
      
      // Ensure isLent is set
      debtData.isLent = isLent || debt?.isLent || false;

      if (debt) {
        updateDebtInStore(debt.id, debtData);
        await updateDebt(debt.id, debtData);
      } else {
        // Add to Firebase and get the real document ID
        const docRef = await addDebt(user.uid, debtData);
        
        // Create debt with the real Firebase ID
        const debtWithRealId = {
          ...debtData,
          id: docRef.id  // Use Firebase's generated ID
        };
        
        // Add to store with the correct ID
        addDebtToStore(debtWithRealId);
      }
      
      reset();
      onSuccess();
    } catch (error) {
      console.error("Error saving debt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{isLent ? 'Nombre del Préstamo / Persona' : 'Nombre de la Deuda'}</label>
        <input
          type="text"
          {...register('name')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={isLent ? "Ej: Préstamo a Juan" : "Ej: Tarjeta BBVA"}
          data-testid="debt-name-input"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Moneda</label>
        <select
          {...register('currency')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="debt-currency-select"
        >
          <option value="PEN">Soles (S/)</option>
          <option value="USD">Dólares ($)</option>
        </select>
        {errors.currency && <p className="text-xs text-red-500">{errors.currency.message as string}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{isLent ? 'Monto Prestado' : 'Monto Total'}</label>
          <input
            type="number"
            step="0.01"
            {...register('totalAmount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="debt-total-amount-input"
          />
          {errors.totalAmount && <p className="text-xs text-red-500">{errors.totalAmount.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{isLent ? 'Me han pagado' : 'Ya pagaste'}</label>
          <input
            type="number"
            step="0.01"
            {...register('paidAmount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="debt-paid-amount-input"
          />
          {errors.paidAmount && <p className="text-xs text-red-500">{errors.paidAmount.message as string}</p>}
          {isExceeded && (
            <p className="text-xs text-amber-600 font-medium">⚠️ El monto que ingresaste es mayor al total de la deuda</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha Límite (Opcional)</label>
        <input
          type="date"
          {...register('dueDate')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="debt-due-date-input"
        />
      </div>


      <Button type="submit" className="w-full" disabled={isSubmitting || isExceeded} data-testid="save-debt-button">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {debt ? 'Actualizar' : 'Guardar'}
      </Button>
    </form>
  );
};
