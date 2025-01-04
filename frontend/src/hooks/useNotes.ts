import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteService } from '../services/noteService';
import { Note } from '../types/note';

interface CreateNoteParams {
  text?: string;
  files?: File[];
}

export const useNotes = (searchQuery?: string) => {
  const queryClient = useQueryClient();
  const PAGE_SIZE = 20;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['notes', { searchQuery }],
    queryFn: async ({ pageParam = 0 }) => {
      const notes = await noteService.getAll({
        offset: pageParam,
        limit: PAGE_SIZE,
        searchQuery
      });
      return notes;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0
  });

  const createMutation = useMutation({
    mutationFn: ({ text, files }: CreateNoteParams) => 
      noteService.create(text, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  // Flatten pages of notes into a single array
  const notes = data?.pages.flat() ?? [];

  const fetchMoreNotes = async (offset: number) => {
    const result = await fetchNextPage();
    return result.data?.pages.flat() ?? [];
  };

  return {
    notes,
    createNote: (text?: string, files?: File[]) => 
      createMutation.mutateAsync({ text, files }),
    fetchMoreNotes,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isSuccess: createMutation.isSuccess,
    isError: isError || createMutation.isError,
    error
  };
};