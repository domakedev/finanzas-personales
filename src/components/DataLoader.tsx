"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { getAccounts, getTransactions, getDebts, getGoals } from '@/lib/db';
import { LoadingFinance } from '@/components/ui/LoadingFinance';

export default function DataLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setAccounts, setTransactions, setDebts, setGoals } = useStore();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (user && !isDataLoaded) {
      // Load data only once when user is authenticated and data hasn't been loaded yet
      Promise.all([
        getAccounts(user.uid),
        getTransactions(user.uid),
        getDebts(user.uid),
        getGoals(user.uid)
      ]).then(([accs, txs, dbs, gls]) => {
        setAccounts(accs);
        setTransactions(txs);
        setDebts(dbs);
        setGoals(gls);
        setIsDataLoaded(true);
      }).catch(error => {
        console.error("Error loading data:", error);
      });
    }
  }, [user, isDataLoaded, setAccounts, setTransactions, setDebts, setGoals]);

  // Show loading if user is authenticated but data hasn't been loaded yet
  if (user && !isDataLoaded) {
    return <LoadingFinance />;
  }

  return <>{children}</>;
}