import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'

interface RightSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function RightSideBar({ children, className }: RightSideBarProps) {
  const { t } = useTranslation()
  const recentCommands = useUIStore(state => state.recentCommands)

  return (
    <aside
      className={cn('flex h-full flex-col border-l glass', className)}
      aria-label="Right sidebar"
    >
      {children || (
        <div className="flex flex-col p-4 gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t('sidebar.recentCommands', 'Recent Commands')}</span>
          </div>
          {recentCommands.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('sidebar.noRecentCommands', 'No commands executed yet')}
            </p>
          ) : (
            <ul className="space-y-1" role="list" aria-label="Recent commands">
              {recentCommands.map(cmd => (
                <li
                  key={cmd.id}
                  className="text-xs text-muted-foreground truncate"
                >
                  {t(cmd.labelKey)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
