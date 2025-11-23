import { useStore } from './store';

/**
 * Hook to check if data is loaded
 * Data is now loaded once at app initialization by DataLoader component
 * This hook now just returns loading state as false since data should already be available
 */
export const useLoadData = () => {
  const { accounts } = useStore();

  // Data should already be loaded by DataLoader, so we consider it not loading
  // If accounts is empty, it might still be loading, but this is handled by DataLoader
  const isLoading = accounts.length === 0;

  return { isLoading };
};
