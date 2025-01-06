import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { noteService } from '@/services/noteService';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchFilters } from '@/components/layout/SearchPanel';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters | null>(null);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => noteService.search({ query, ...filters }),
    enabled: !!(query || filters),
  });

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setFilters(null); // Reset filters when doing basic search
  };

  const handleAdvancedSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setQuery(newFilters.query);
  };

  return {
    query,
    filters,
    results,
    isLoading,
    handleSearch,
    handleAdvancedSearch,
  };
};