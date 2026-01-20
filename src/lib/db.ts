import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  runTransaction,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { Account, Transaction, Debt, Goal, Budget, Category } from '@/types';

// Helper to convert Firestore data to our types
const convertDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() });

// Accounts
export const getAccounts = async (userId: string): Promise<Account[]> => {
  const q = query(collection(db, 'accounts'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertDoc<Account>);
};

export const addAccount = async (userId: string, account: Omit<Account, 'id'>) => {
  return addDoc(collection(db, 'accounts'), { ...account, userId });
};

export const updateAccount = async (accountId: string, account: Partial<Account>) => {
  return updateDoc(doc(db, 'accounts', accountId), account);
};

export const deleteAccount = async (accountId: string) => {
  return deleteDoc(doc(db, 'accounts', accountId));
};

// Transactions
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...convertDoc<Transaction>(doc),
      date: (data.date as Timestamp).toDate(),
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : (data.date as Timestamp).toDate()
    };
  });
  // Sort by createdAt descending
  return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const addTransaction = async (userId: string, transaction: Omit<Transaction, 'id'>) => {
  return addDoc(collection(db, 'transactions'), {
    ...transaction,
    userId,
    date: Timestamp.fromDate(transaction.date),
    createdAt: Timestamp.now()
  });
};

export const updateTransaction = async (transactionId: string, transaction: Partial<Omit<Transaction, 'id'>>) => {
  const data = transaction.date
    ? { ...transaction, date: Timestamp.fromDate(transaction.date) }
    : transaction;
  return updateDoc(doc(db, 'transactions', transactionId), data);
};

export const deleteTransaction = async (transactionId: string) => {
  return deleteDoc(doc(db, 'transactions', transactionId));
};

export const deleteTransactionAtomic = async (transactionId: string) => {
  try {
    // 1. Read the transaction first (outside of runTransaction to avoid security rule issues)
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionDoc = await getDoc(transactionRef);

    if (!transactionDoc.exists()) {
      throw new Error("Transaction does not exist!");
    }
    const txData = transactionDoc.data();
    const amount = Number(txData.amount) || 0;
    const type = txData.type;
    const accountId = txData.accountId;
    const fromAccountId = txData.fromAccountId;
    const debtId = txData.debtId;
    const goalId = txData.goalId;

    // 2. Update account balances (revert the transaction effects)
    const updatePromises = [];

    if (type === 'EXPENSE' && accountId) {
      // Check if accountId is a credit card (stored in debts)
      const debtRef = doc(db, 'debts', accountId);
      const debtDoc = await getDoc(debtRef);
      if (debtDoc.exists() && debtDoc.data().isCreditCard) {
        // It's a credit card expense, revert by subtracting from totalAmount
        const currentTotal = Number(debtDoc.data().totalAmount) || 0;
        const newTotal = Math.max(0, currentTotal - amount);
        updatePromises.push(updateDoc(debtRef, { totalAmount: newTotal }));
      } else {
        // Regular account expense, add back to balance
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        if (accountDoc.exists()) {
          const currentBalance = Number(accountDoc.data().balance) || 0;
          const newBalance = currentBalance + amount;
          updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
        }
      }
    } else if (type === 'INCOME' && accountId) {
      const accountRef = doc(db, 'accounts', accountId);
      const accountDoc = await getDoc(accountRef);
      if (accountDoc.exists()) {
        const currentBalance = Number(accountDoc.data().balance) || 0;
        const newBalance = currentBalance - amount;
        updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
      }
    } else if (type === 'TRANSFER') {
      // Origin account - add back the amount
      if (fromAccountId) {
        const fromAccountRef = doc(db, 'accounts', fromAccountId);
        const fromAccountDoc = await getDoc(fromAccountRef);
        if (fromAccountDoc.exists()) {
          const currentBalance = Number(fromAccountDoc.data().balance) || 0;
          const newBalance = currentBalance + amount;
          updatePromises.push(updateDoc(fromAccountRef, { balance: newBalance }));
        }
      }

      // Destination account - subtract the converted amount
      if (accountId) {
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        if (accountDoc.exists()) {
          const convertedAmount = Number(txData.convertedAmount);
          const amountToRevert = !isNaN(convertedAmount) && convertedAmount !== 0 ? convertedAmount : amount;
          const currentBalance = Number(accountDoc.data().balance) || 0;
          const newBalance = currentBalance - amountToRevert;
          updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
        }
      }
    } else if (type === 'PAY_DEBT') {
      // Revert account balance (add back the payment)
      if (accountId) {
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        if (accountDoc.exists()) {
          const currentBalance = Number(accountDoc.data().balance) || 0;
          const newBalance = currentBalance + amount;
          updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
        }
      }

      // Revert debt paidAmount (subtract the payment) - only if debt exists
      if (debtId) {
        try {
          const debtRef = doc(db, 'debts', debtId);
          //exist in firebase?
          const debtDoc = await getDoc(debtRef);
          if (debtDoc.exists()) {
            const currentPaidAmount = Number(debtDoc.data().paidAmount) || 0;
            const newPaidAmount = Math.max(0, Math.round((currentPaidAmount - amount) * 100) / 100);
            updatePromises.push(updateDoc(debtRef, { paidAmount: newPaidAmount }));
          }
        } catch (error) {
          console.error("Error preparing debt update:", error);
          // Continue without updating debt
        }
      }
    } else if (type === 'PAY_CREDIT_CARD') {
      // Revert account balance (add back the payment)
      if (accountId) {
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        if (accountDoc.exists()) {
          const currentBalance = Number(accountDoc.data().balance) || 0;
          const newBalance = currentBalance + amount;
          updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
        }
      }

      // Revert debt paidAmount (subtract the payment) - only if debt exists
      if (debtId) {
        try {
          const debtRef = doc(db, 'debts', debtId);
          // Check if debt exists in firebase?
          const debtDoc = await getDoc(debtRef);
          if (debtDoc.exists()) {
            const currentPaidAmount = Number(debtDoc.data().paidAmount) || 0;
            const newPaidAmount = Math.max(0, Math.round((currentPaidAmount - amount) * 100) / 100);
            updatePromises.push(updateDoc(debtRef, { paidAmount: newPaidAmount }));
          }
        } catch (error) {
          console.error("Error preparing debt update:", error);
          // Continue without updating debt
        }
      }
    } else if (type === 'SAVE_FOR_GOAL') {
      // Revert account balance (add back the saving)
      if (accountId) {
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        if (accountDoc.exists()) {
          const accountData = accountDoc.data();
          const currentBalance = Number(accountData.balance) || 0;
          const newBalance = currentBalance + amount;
          updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
        } else {
        }
      }

      // Revert goal currentAmount (subtract the saving) - only if goal exists
      if (goalId) {
        try {
          const goalRef = doc(db, 'goals', goalId);
          const goalDoc = await getDoc(goalRef);
          if (goalDoc.exists()) {
            const currentCurrentAmount = Number(goalDoc.data().currentAmount) || 0;
            const newCurrentAmount = Math.max(0, Math.round((currentCurrentAmount - amount) * 100) / 100);
            updatePromises.push(updateDoc(goalRef, { currentAmount: newCurrentAmount }));
          }
        } catch (error) {
          console.error("Error preparing goal update:", error);
          // Continue without updating goal
        }
      }
    } else if (type === 'RECEIVE_DEBT_PAYMENT') {
      // Revert account balance (subtract the payment received)
      if (accountId) {
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        if (accountDoc.exists()) {
          const currentBalance = Number(accountDoc.data().balance) || 0;
          const newBalance = currentBalance - amount;
          updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
        }
      }

      // Revert debt paidAmount (subtract the payment) - only if debt exists
      if (debtId) {
        try {
          const debtRef = doc(db, 'debts', debtId);
          const debtDoc = await getDoc(debtRef);
          if (debtDoc.exists()) {
            const currentPaidAmount = Number(debtDoc.data().paidAmount) || 0;
            const newPaidAmount = Math.max(0, Math.round((currentPaidAmount - amount) * 100) / 100);
            updatePromises.push(updateDoc(debtRef, { paidAmount: newPaidAmount }));
          }
        } catch (error) {
          console.error("Error preparing debt update:", error);
          // Continue without updating debt
        }
      }
    }

    // 3. Execute all balance updates
    await Promise.all(updatePromises);

    // 4. Delete the transaction
    await deleteDoc(transactionRef);

  } catch (error) {
    console.error("Error deleting transactionxxx:", error);
    throw error;
  }
};

// Debts
export const getDebts = async (userId: string): Promise<Debt[]> => {
  const q = query(collection(db, 'debts'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...convertDoc<Debt>(doc),
      // Convert Timestamp to Date if dueDate exists
      dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
      // paymentDate is stored as number (day of month)
      paymentDate: data.paymentDate ? Number(data.paymentDate) : undefined,
      // cutoffDate is stored as number (day of month)
      cutoffDate: data.cutoffDate ? Number(data.cutoffDate) : undefined
    };
  });
};

export const addDebt = async (userId: string, debt: Omit<Debt, 'id'>) => {
  const debtData: any = { ...debt, userId };
  // Convert Date to Timestamp if dueDate exists
  if (debt.dueDate) {
    debtData.dueDate = Timestamp.fromDate(debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate));
  }
  // paymentDate is stored as number (no conversion needed)
  // cutoffDate is stored as number (no conversion needed)
  return addDoc(collection(db, 'debts'), debtData);
};

export const updateDebt = async (debtId: string, debt: Partial<Debt>) => {
  const debtData: any = { ...debt };
  // Convert Date to Timestamp if dueDate exists
  if (debt.dueDate !== undefined) {
    if (debt.dueDate) {
      debtData.dueDate = Timestamp.fromDate(debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate));
    }
    // If dueDate is explicitly set to undefined/null, don't include it in the update
  }
  // paymentDate is stored as number (no conversion needed)
  // cutoffDate is stored as number (no conversion needed)
  return updateDoc(doc(db, 'debts', debtId), debtData);
};

export const deleteDebt = async (debtId: string) => {
  return deleteDoc(doc(db, 'debts', debtId));
};

// Goals
export const getGoals = async (userId: string): Promise<Goal[]> => {
  const q = query(collection(db, 'goals'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertDoc<Goal>);
};

export const addGoal = async (userId: string, goal: Omit<Goal, 'id'>) => {
  return addDoc(collection(db, 'goals'), { ...goal, userId });
};

export const updateGoal = async (goalId: string, goal: Partial<Goal>) => {
  return updateDoc(doc(db, 'goals', goalId), goal);
};

export const deleteGoal = async (goalId: string) => {
  return deleteDoc(doc(db, 'goals', goalId));
};

// Budgets
export const getBudget = async (userId: string, month: number, year: number): Promise<Budget | null> => {
  const q = query(
    collection(db, 'budgets'),
    where('userId', '==', userId),
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return convertDoc<Budget>(snapshot.docs[0]);
};

export const saveBudget = async (userId: string, budget: Omit<Budget, 'id' | 'userId'>) => {
  // Check if budget exists for this month/year
  const existingBudget = await getBudget(userId, budget.month, budget.year);

  if (existingBudget && existingBudget.id) {
    return updateDoc(doc(db, 'budgets', existingBudget.id), budget);
  } else {
    return addDoc(collection(db, 'budgets'), { ...budget, userId });
  }
};

// Categories
export const getCategories = async (userId: string): Promise<Category[]> => {
  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertDoc<Category>);
};

export const addCategory = async (userId: string, category: Omit<Category, 'id' | 'userId'>) => {
  return addDoc(collection(db, 'categories'), { ...category, userId });
};

export const updateCategory = async (categoryId: string, category: Partial<Category>) => {
  return updateDoc(doc(db, 'categories', categoryId), category);
};

export const deleteCategory = async (categoryId: string) => {
  return deleteDoc(doc(db, 'categories', categoryId));
};
