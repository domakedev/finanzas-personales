import { z } from 'zod';

export const AccountSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(['BANK', 'WALLET', 'CASH']),
  currency: z.enum(['PEN', 'USD']),
  balance: z.coerce.number().min(0, "El saldo no puede ser negativo"),
  logo: z.string().optional(),
  icon: z.string().optional(),
});

export const TransactionSchema = z.object({
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  description: z.string().min(1, "La descripción es obligatoria"),
  date: z.coerce.date().max(new Date(), "No puedes crear transacciones con fechas futuras"),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'PAY_DEBT']),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Selecciona una cuenta"),
  fromAccountId: z.string().optional(), // For transfers
  debtId: z.string().optional(), // For debt payments
  exchangeRate: z.coerce.number().positive().optional(), // For cross-currency transfers
});

export const DebtSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  totalAmount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  paidAmount: z.coerce.number().min(0, "El monto pagado no puede ser negativo"),
  currency: z.enum(['PEN', 'USD']),
  dueDate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.date().optional()
  ),
}).refine((data) => data.paidAmount <= data.totalAmount, {
  message: "El monto pagado no puede exceder el total de la deuda",
  path: ["paidAmount"],
});

export const GoalSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  targetAmount: z.coerce.number().min(0.01, "La meta debe ser mayor a 0"),
  currentAmount: z.coerce.number().min(0, "El ahorro actual no puede ser negativo"),
  currency: z.enum(['PEN', 'USD']),
  deadline: z.coerce.date().optional(),
});

export type AccountFormData = z.infer<typeof AccountSchema>;
export type TransactionFormData = z.infer<typeof TransactionSchema>;
export type DebtFormData = z.infer<typeof DebtSchema>;
export type GoalFormData = z.infer<typeof GoalSchema>;
