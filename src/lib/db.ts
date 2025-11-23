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
import { Account, Transaction, Debt, Goal } from '@/types';

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
  return snapshot.docs.map(doc => ({
    ...convertDoc<Transaction>(doc),
    date: (doc.data().date as Timestamp).toDate()
  }));
};

export const addTransaction = async (userId: string, transaction: Omit<Transaction, 'id'>) => {
  return addDoc(collection(db, 'transactions'), { 
    ...transaction, 
    userId,
    date: Timestamp.fromDate(transaction.date) 
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

    // 2. Update account balances (revert the transaction effects)
    const updatePromises = [];

    if (type === 'EXPENSE' && accountId) {
      const accountRef = doc(db, 'accounts', accountId);
      const accountDoc = await getDoc(accountRef);
      if (accountDoc.exists()) {
        const currentBalance = Number(accountDoc.data().balance) || 0;
        const newBalance = currentBalance + amount;
        updatePromises.push(updateDoc(accountRef, { balance: newBalance }));
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
    }

    // 3. Execute all balance updates
    await Promise.all(updatePromises);

    // 4. Delete the transaction
    await deleteDoc(transactionRef);
    
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

// Debts
export const getDebts = async (userId: string): Promise<Debt[]> => {
  const q = query(collection(db, 'debts'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertDoc<Debt>);
};

export const addDebt = async (userId: string, debt: Omit<Debt, 'id'>) => {
  return addDoc(collection(db, 'debts'), { ...debt, userId });
};

export const updateDebt = async (debtId: string, debt: Partial<Debt>) => {
  return updateDoc(doc(db, 'debts', debtId), debt);
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
