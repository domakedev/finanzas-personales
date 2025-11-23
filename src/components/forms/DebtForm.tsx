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
}

export const DebtForm: React.FC<DebtFormProps> = ({ onSuccess, debt }) => {
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
    }
  });

  const paidAmount = watch('paidAmount') as number;
  const totalAmount = watch('totalAmount') as number;
  const isExceeded = paidAmount > totalAmount && totalAmount > 0;

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (debt) {
        updateDebtInStore(debt.id, data);
        await updateDebt(debt.id, data);
      } else {
        // Add to Firebase and get the real document ID
        const docRef = await addDebt(user.uid, data);
        
        // Create debt with the real Firebase ID
        const debtWithRealId = {
          ...data,
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
        <label className="text-sm font-medium">Nombre de la Deuda</label>
        <input 
          type="text" 
          {...register('name')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej: Tarjeta BBVA"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Monto Total</label>
          <input 
            type="number" 
            step="0.01"
            {...register('totalAmount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
          />
          {errors.totalAmount && <p className="text-xs text-red-500">{errors.totalAmount.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pagado hasta hoy</label>
          <input 
            type="number" 
            step="0.01"
            {...register('paidAmount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
          />
          {errors.paidAmount && <p className="text-xs text-red-500">{errors.paidAmount.message as string}</p>}
          {isExceeded && (
            <p className="text-xs text-amber-600 font-medium">⚠️ El monto pagado no puede exceder el total de la deuda</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha Límite (Opcional)</label>
        <input 
          type="date" 
          {...register('dueDate')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || isExceeded}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {debt ? 'Actualizar Deuda' : 'Guardar Deuda'}
      </Button>
    </form>
  );
};
