import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { noteService } from '@/services/noteService';
import { useDebounce } from '@/hooks/useDebounce';

export function useSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => noteService.search({ query: debouncedQuery }),
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