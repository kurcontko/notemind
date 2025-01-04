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
      console.log("Fetching notes with offset:", pageParam);
      const notes = await noteService.getAll({
        offset: pageParam,
        limit: PAGE_SIZE,
        searchQuery
      });
      return { notes, nextPage: pageParam + PAGE_SIZE };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      // Use the `nextPage` property from the returned data
      return lastPage.notes.length === PAGE_SIZE ? lastPage.nextPage : undefined;
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ text, files }: CreateNoteParams) => 
      noteService.create(text, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  // Flatten pages of notes into a single array
  const notes = data?.pages.flatMap((page) => page.notes) ?? [];

  return {
    notes,
    createNote: (text?: string, files?: File[]) =>
      createMutation.mutateAsync({ text, files }),
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isSuccess: createMutation.isSuccess,
    isError: isError || createMutation.isError,
    error
  };
};