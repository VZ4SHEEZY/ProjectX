import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAPIReturn<T> extends UseAPIState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useAPI<T>(apiFunction: (...args: any[]) => Promise<{ data: { data: T } }>): UseAPIReturn<T> {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (...args: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiFunction(...args);
      const data = response.data.data;
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      const errorMessage = axiosError.response?.data?.message || 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// Hook for paginated data
export function usePaginatedAPI<T>(apiFunction: (params: any) => Promise<{ data: { data: T[]; total: number; totalPages: number } }>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (params: any = {}, reset: boolean = false) => {
    if (loading) return;

    const currentPage = reset ? 1 : page;
    
    setLoading(true);
    setError(null);

    try {
      const response = await apiFunction({ ...params, page: currentPage });
      const { data: newData, totalPages } = response.data;

      if (reset) {
        setData(newData);
        setPage(2);
      } else {
        setData(prev => [...prev, ...newData]);
        setPage(prev => prev + 1);
      }

      setHasMore(currentPage < totalPages);
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      setError(axiosError.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiFunction, loading, page]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return { data, loading, error, hasMore, fetchData, reset };
}

export default useAPI;
