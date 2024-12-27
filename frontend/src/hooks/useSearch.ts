import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memoryService } from '@/services/memoryService';
import { useDebounce } from './useDebounce';

export function useSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => memoryService.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return {
    query,
    results,
    isLoading,
    handleSearch,
  };
}