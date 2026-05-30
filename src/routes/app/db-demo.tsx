import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus } from 'lucide-react'
import { useNotes, useCreateNote, useDeleteNote } from '@/services/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/db-demo')({
  component: DbDemoPage,
})

function DbDemoPage() {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const { data: notes = [], isLoading } = useNotes()
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()

  async function handleCreate() {
    if (!title.trim()) return
    try {
      await createNote.mutateAsync({ title: title.trim(), content: '' })
      setTitle('')
      toast.success(t('dbDemo.created'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteNote.mutateAsync(id)
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-lg">
      <h1 className="text-2xl font-semibold">{t('dbDemo.title')}</h1>

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t('dbDemo.placeholder')}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={createNote.isPending || !title.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('dbDemo.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map(note => (
            <li key={note.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm">{note.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(note.id)}
                disabled={deleteNote.isPending}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
