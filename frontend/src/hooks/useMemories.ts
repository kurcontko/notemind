// frontend/src/hooks/useMemories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memoryService } from '../services/memoryService'

export const useMemories = () => {
  const queryClient = useQueryClient()
  
  const { data: memories } = useQuery({
    queryKey: ['memories'],
    queryFn: memoryService.getAll
  })

  const createMutation = useMutation({
    mutationFn: memoryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
    }
  })

  return {
    memories,
    createMemory: createMutation.mutate,
    isLoading: createMutation.isPending
  }
}