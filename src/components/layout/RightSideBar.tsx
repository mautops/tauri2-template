import { useTranslation } from 'react-i18next'
import { History, Trash2 } from 'lucide-react'
import { useUIStore, MAX_ENTRY_LENGTH } from '@/store/ui-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RightSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function RightSideBar({ children, className }: RightSideBarProps) {
  const { t } = useTranslation()
  const quickPaneEntries = useUIStore(state => state.quickPaneEntries)
  const clearQuickPaneEntries = useUIStore(state => state.clearQuickPaneEntries)

  return (
    <aside
      className={cn('flex h-full flex-col border-l glass', className)}
      aria-label="Right sidebar"
    >
      {children || (
        <div className="flex flex-col p-4 gap-3 h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="h-4 w-4" />
              <span>{t('sidebar.quickPaneEntries')}</span>
            </div>
            {quickPaneEntries.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={clearQuickPaneEntries}
                title={t('sidebar.clearEntries')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {quickPaneEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('sidebar.noQuickPaneEntries')}
            </p>
          ) : (
            <ul
              className="space-y-1.5 overflow-auto flex-1"
              role="list"
              aria-label="Quick pane entries"
            >
              {quickPaneEntries.map(entry => (
                <li
                  key={entry.id}
                  className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50"
                  title={
                    entry.text.length >= MAX_ENTRY_LENGTH
                      ? entry.text
                      : undefined
                  }
                >
                  {entry.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
