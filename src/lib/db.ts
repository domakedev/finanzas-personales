import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc,
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
