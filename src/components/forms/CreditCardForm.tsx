"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCardSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { addDebt, updateDebt } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { addMoney, subtractMoney } from '@/lib/utils';
import { Debt } from '@/types';
import { BANKS, DIGITAL_WALLETS } from '@/constants/categories';
import { OptionSelector } from '@/components/ui/OptionSelector';

interface CreditCardFormProps {
  onSuccess: () => void;
  debt?: Debt;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({ onSuccess, debt }) => {
  const { user } = useAuth();
  const addDebtToStore = useStore((state) => state.addDebt);
  const updateDebtInStore = useStore((state) => state.updateDebt);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(debt?.name || '');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // What the user actually owes today (charges minus payments)
  const currentDebtValue = debt ? subtractMoney(debt.totalAmount, debt.paidAmount || 0) : 0;

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(CreditCardSchema),
    defaultValues: {
      name: debt?.name || '',
      currentDebt: currentDebtValue,
      currency: debt?.currency || 'PEN',
      creditLimit: debt?.creditLimit || 0,
      creditCardType: debt?.creditCardType || 'BANK',
      paymentDate: debt?.paymentDate || undefined,
      cutoffDate: debt?.cutoffDate || undefined,
      lastFourDigits: debt?.lastFourDigits || '',
      minimumPayment: debt?.minimumPayment || 0,
      totalPayment: debt?.totalPayment || 0,
      logo: debt?.logo,
      icon: debt?.icon,
      isCreditCard: true,
    }
  });

  const creditCardType = watch('creditCardType');
  const lastFourDigits = watch('lastFourDigits');
  const creditLimit = Number(watch('creditLimit')) || 0;
  const currentDebt = Number(watch('currentDebt')) || 0;
  const isExceeded = currentDebt > creditLimit && creditLimit > 0;

  const handleOptionSelect = (option: { id: string; name: string; logo?: string; icon?: string; type: string }) => {
    setSelectedOption(option.name);
    setValue('name', option.name);
    setValue('creditCardType', option.type as 'BANK' | 'WALLET');
    // Save logo
    setValue('logo', option.logo);
    setValue('icon', undefined);
  };

  const formatCardNumber = (digits: string) => {
    if (!digits) return '';
    return `****-${digits}`;
  };

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Handle optional fields - remove if empty or undefined
      const { currentDebt: newCurrentDebt, ...debtData } = { ...data };

      // Keep the payments history and move totalAmount so that (totalAmount - paidAmount) = what the user owes today
      const paidAmount = debt?.paidAmount || 0;
      debtData.paidAmount = paidAmount;
      debtData.totalAmount = addMoney(paidAmount, Number(newCurrentDebt) || 0);

      // Remove undefined or empty string values (but keep 0 as valid value)
      Object.keys(debtData).forEach(key => {
        if (debtData[key] === undefined || debtData[key] === '') {
          delete debtData[key];
        }
      });

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
    } catch (error: any) {
      console.error("Error saving credit card:", error);
      setSubmitError(error.message || "Error al guardar la tarjeta de crédito");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOptions = creditCardType === 'BANK' ? BANKS : DIGITAL_WALLETS;

  return (
    <div className="flex flex-col max-h-[80vh]">
      <div className="flex-1 overflow-y-auto px-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
              <div className="text-sm">{submitError}</div>
            </div>
          )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Tarjeta</label>
          <select
            {...register('creditCardType')}
            onChange={(e) => {
              setValue('creditCardType', e.target.value as 'BANK' | 'WALLET');
              setSelectedOption('');
              setValue('name', '');
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="credit-card-type-select"
          >
            <option value="BANK">Banco</option>
            <option value="WALLET">Billetera Digital</option>
          </select>
          {errors.creditCardType && <p className="text-xs text-red-500">{errors.creditCardType.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Moneda</label>
          <select
            {...register('currency')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="credit-card-currency-select"
          >
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares ($)</option>
          </select>
          {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
        </div>
      </div>

      {/* Grid de opciones con logos */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {creditCardType === 'BANK' ? 'Banco' : 'Billetera'}
        </label>
        <OptionSelector
          options={filteredOptions}
          selectedOption={selectedOption}
          onSelect={handleOptionSelect}
          testIdPrefix="credit-card-option"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre de la Tarjeta</label>
        <input
          type="text"
          {...register('name')}
          value={selectedOption}
          onChange={(e) => {
            setSelectedOption(e.target.value);
            setValue('name', e.target.value);
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej: Mi tarjeta BCP"
          data-testid="credit-card-name-input"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Últimos 4 dígitos</label>
        <input
          type="text"
          {...register('lastFourDigits')}
          maxLength={4}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="1234"
          data-testid="credit-card-last-four-input"
        />
        {lastFourDigits && (
          <p className="text-xs text-muted-foreground">Se mostrará como: {formatCardNumber(lastFourDigits)}</p>
        )}
        {errors.lastFourDigits && <p className="text-xs text-red-500">{errors.lastFourDigits.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Crédito Total (Límite)</label>
          <input
            type="number"
            step="0.01"
            {...register('creditLimit')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="credit-card-limit-input"
          />
          {errors.creditLimit && <p className="text-xs text-red-500">{errors.creditLimit.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Deuda actual (lo que debes hoy)</label>
          <input
            type="number"
            step="0.01"
            {...register('currentDebt')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="credit-card-debt-input"
          />
          {errors.currentDebt && <p className="text-xs text-red-500">{errors.currentDebt.message}</p>}
          <p className="text-xs text-muted-foreground">Copia el saldo deudor que muestra tu banco. Puede ser 0.</p>
          {isExceeded && (
            <p className="text-xs text-amber-600 font-medium">⚠️ La deuda no puede exceder el límite de crédito</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Pago Mínimo del Mes</label>
          <input
            type="number"
            step="0.01"
            {...register('minimumPayment')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="credit-card-minimum-payment-input"
          />
          {errors.minimumPayment && <p className="text-xs text-red-500">{errors.minimumPayment.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pago Total del Mes</label>
          <input
            type="number"
            step="0.01"
            {...register('totalPayment')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="credit-card-total-payment-input"
          />
          {errors.totalPayment && <p className="text-xs text-red-500">{errors.totalPayment.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Día de Corte (1-31)</label>
          <input
            type="number"
            min="1"
            max="31"
            {...register('cutoffDate')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ej: 16"
            data-testid="credit-card-cutoff-date-input"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Día de Pago (1-31)</label>
          <input
            type="number"
            min="1"
            max="31"
            {...register('paymentDate')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ej: 25"
            data-testid="credit-card-payment-date-input"
          />
          {errors.paymentDate && <p className="text-xs text-red-500">{errors.paymentDate.message}</p>}
        </div>
      </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || isExceeded} data-testid="save-credit-card-button">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {debt ? 'Actualizar Tarjeta' : 'Guardar Tarjeta'}
          </Button>

          {/* Hidden inputs to ensure logo/icon are submitted */}
          <input type="hidden" {...register('logo')} />
          <input type="hidden" {...register('icon')} />
          <input type="hidden" {...register('isCreditCard')} />
        </form>
      </div>
    </div>
  );
};