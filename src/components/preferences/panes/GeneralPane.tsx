import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleHelp, LogOut } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore } from '@/store/auth-store'
import { SettingsSection } from '../shared/SettingsComponents'

export function GeneralPane() {
  const { t } = useTranslation()
  const [exampleText, setExampleText] = useState('Example value')
  const [exampleToggle, setExampleToggle] = useState(true)
  const username = useAuthStore(state => state.username)
  const logout = useAuthStore(state => state.logout)

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.general.account')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.general.account')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{username}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('preferences.general.logout')}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('preferences.general.exampleSettings')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.general.exampleText')}
          </span>
          <div className="flex items-center gap-2">
            <Input
              value={exampleText}
              onChange={e => setExampleText(e.target.value)}
              placeholder={t('preferences.general.exampleTextPlaceholder')}
              className="w-48"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.general.exampleTextDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.general.exampleTextDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.general.exampleToggle')}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="example-toggle"
                checked={exampleToggle}
                onCheckedChange={setExampleToggle}
              />
              <Label
                htmlFor="example-toggle"
                className="text-sm text-muted-foreground"
              >
                {exampleToggle ? t('common.enabled') : t('common.disabled')}
              </Label>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.general.exampleToggleDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.general.exampleToggleDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
