"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoalSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { addGoal, updateGoal } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { Goal } from '@/types';

interface GoalFormProps {
  onSuccess: () => void;
  goal?: Goal;
}

export const GoalForm: React.FC<GoalFormProps> = ({ onSuccess, goal }) => {
  const { user } = useAuth();
  const addGoalToStore = useStore((state) => state.addGoal);
  const updateGoalInStore = useStore((state) => state.updateGoal);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(GoalSchema),
    defaultValues: {
      name: goal?.name || '',
      targetAmount: goal?.targetAmount || 0,
      currentAmount: goal?.currentAmount || 0,
    }
  });

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (goal) {
        updateGoalInStore(goal.id, data);
        await updateGoal(goal.id, data);
      } else {
        // Add to Firebase and get the real document ID
        const docRef = await addGoal(user.uid, data);
        
        // Create goal with the real Firebase ID
        const goalWithRealId = {
          ...data,
          id: docRef.id  // Use Firebase's generated ID
        };
        
        // Add to store with the correct ID
        addGoalToStore(goalWithRealId);
      }
      
      reset();
      onSuccess();
    } catch (error) {
      console.error("Error adding goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre de la Meta</label>
        <input 
          type="text" 
          {...register('name')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej: Laptop Nueva"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Meta Total</label>
          <input 
            type="number" 
            step="0.01"
            {...register('targetAmount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
          />
          {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Ahorrado Actual</label>
          <input 
            type="number" 
            step="0.01"
            {...register('currentAmount')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
          />
          {errors.currentAmount && <p className="text-xs text-red-500">{errors.currentAmount.message as string}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Fecha Objetivo (Opcional)</label>
        <input 
          type="date" 
          {...register('deadline')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {goal ? 'Actualizar Meta' : 'Guardar Meta'}
      </Button>
    </form>
  );
};
