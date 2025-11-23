"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { getAccounts, getTransactions, getDebts, getGoals, getBudget, getCategories } from '@/lib/db';
import { LoadingFinance } from '@/components/ui/LoadingFinance';

export default function DataLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setAccounts, setTransactions, setDebts, setGoals, setCurrentBudget, setCategories } = useStore();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (user && !isDataLoaded) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Load data only once when user is authenticated and data hasn't been loaded yet
      Promise.all([
        getAccounts(user.uid),
        getTransactions(user.uid),
        getDebts(user.uid),
        getGoals(user.uid),
        getBudget(user.uid, currentMonth, currentYear),
        getCategories(user.uid)
      ]).then(([accs, txs, dbs, gls, budget, cats]) => {
        setAccounts(accs);
        setTransactions(txs);
        setDebts(dbs);
        setGoals(gls);
        setCurrentBudget(budget);
        setCategories(cats);
        setIsDataLoaded(true);
      }).catch(error => {
        console.error("Error loading data:", error);
      });
    }
  }, [user, isDataLoaded, setAccounts, setTransactions, setDebts, setGoals, setCurrentBudget]);

  // Show loading if user is authenticated but data hasn't been loaded yet

  //Comment this if to no interrupt cypress tests
  if (user && !isDataLoaded) {
    return <LoadingFinance />;
  }

  return <>{children}</>;
}