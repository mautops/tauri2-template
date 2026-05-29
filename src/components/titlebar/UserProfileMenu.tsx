import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/auth-store'
import { executeCommand, useCommandContext } from '@/lib/commands'
import { LogOut, Settings } from 'lucide-react'

export function UserProfileMenu() {
  const { t } = useTranslation()
  const username = useAuthStore(state => state.username)
  const logout = useAuthStore(state => state.logout)
  const commandContext = useCommandContext()

  const initial = (username ?? 'A').charAt(0).toUpperCase()

  const handleOpenPreferences = async () => {
    const result = await executeCommand('open-preferences', commandContext)
    if (!result.success && result.error) {
      commandContext.showToast(result.error, 'error')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors outline-none">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden lg:inline">{username}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initial}
          </span>
          <div className="flex flex-col">
            <span className="font-medium">{username}</span>
            <span className="text-xs text-muted-foreground">admin</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenPreferences}>
          <Settings className="h-4 w-4" />
          {t('titlebar.settings')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut className="h-4 w-4" />
          {t('preferences.general.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
