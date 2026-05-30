import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const result = await commands.getNotes()
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const result = await commands.createNote(input)
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await commands.deleteNote(id)
      if (result.status === 'error') throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
