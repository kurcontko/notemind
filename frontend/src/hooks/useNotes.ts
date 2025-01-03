// frontend/src/hooks/useNotes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { noteService } from '../services/noteService'

export const useNotes = () => {
  const queryClient = useQueryClient()
  
  const { data: notes } = useQuery({
    queryKey: ['notes'],
    queryFn: noteService.getAll
  })

  const createMutation = useMutation({
    mutationFn: noteService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  return {
    notes,
    createNote: createMutation.mutate,
    isLoading: createMutation.isPending
  }
}