import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { useStore } from './store';
import { getAccounts, getTransactions, getDebts, getGoals } from './db';

/**
 * Hook to automatically load user data from Firebase
 * Call this in any page that needs data
 * Returns loading state
 */
export const useLoadData = () => {
  const { user } = useAuth();
  const { setAccounts, setTransactions, setDebts, setGoals, accounts } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && accounts.length === 0) {
      // Only load if data is not already loaded
      setIsLoading(true);
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
      }).catch(error => {
        console.error("Error loading data:", error);
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user, setAccounts, setTransactions, setDebts, setGoals, accounts.length]);

  return { isLoading };
};
