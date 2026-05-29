import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CircleHelp } from 'lucide-react'
import { ShortcutPicker } from '../ShortcutPicker'
import { SettingsSection } from '../shared/SettingsComponents'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'

type ShortcutKey =
  | 'quick_pane_shortcut'
  | 'left_sidebar_shortcut'
  | 'right_sidebar_shortcut'

interface ShortcutConfig {
  key: ShortcutKey
  updateCommand: (
    shortcut: string | null
  ) => Promise<{ status: string; error?: string }>
  queryKey: string
  getDefault: () => Promise<string>
  fallbackDefault: string
  labelKey: string
  descriptionKey: string
}

export function ShortcutsPane() {
  const { t } = useTranslation()

  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  const handleShortcutChange = async (
    config: ShortcutConfig,
    newShortcut: string | null
  ) => {
    if (!preferences) return

    const oldShortcut = preferences[config.key]

    logger.info(`Updating ${config.key}`, { oldShortcut, newShortcut })

    const result = await config.updateCommand(newShortcut)

    if (result.status === 'error') {
      logger.error('Failed to register shortcut', { error: result.error })
      toast.error(t('toast.error.shortcutFailed'), {
        description: result.error,
      })
      return
    }

    try {
      await savePreferences.mutateAsync({
        ...preferences,
        [config.key]: newShortcut,
      })
    } catch {
      logger.warn('Save failed, rolling back shortcut registration', {
        oldShortcut,
        newShortcut,
      })

      const rollbackResult = await config.updateCommand(oldShortcut)

      if (rollbackResult.status === 'error') {
        logger.error(
          'Rollback failed - backend and preferences are out of sync',
          {
            error: rollbackResult.error,
            attemptedShortcut: newShortcut,
            originalShortcut: oldShortcut,
          }
        )
        toast.error(t('toast.error.shortcutRestoreFailed'), {
          description: t('toast.error.shortcutRestoreDescription'),
        })
      } else {
        logger.info('Successfully rolled back shortcut registration')
      }
    }
  }

  const shortcutConfigs: ShortcutConfig[] = [
    {
      key: 'quick_pane_shortcut',
      updateCommand: commands.updateQuickPaneShortcut,
      queryKey: 'default-quick-pane-shortcut',
      getDefault: commands.getDefaultQuickPaneShortcut,
      fallbackDefault: 'CommandOrControl+Shift+P',
      labelKey: 'preferences.shortcuts.quickPaneShortcut',
      descriptionKey: 'preferences.shortcuts.quickPaneShortcutDescription',
    },
    {
      key: 'left_sidebar_shortcut',
      updateCommand: commands.updateLeftSidebarShortcut,
      queryKey: 'default-left-sidebar-shortcut',
      getDefault: commands.getDefaultLeftSidebarShortcut,
      fallbackDefault: 'CommandOrControl+Shift+Comma',
      labelKey: 'preferences.shortcuts.leftSidebarShortcut',
      descriptionKey: 'preferences.shortcuts.leftSidebarShortcutDescription',
    },
    {
      key: 'right_sidebar_shortcut',
      updateCommand: commands.updateRightSidebarShortcut,
      queryKey: 'default-right-sidebar-shortcut',
      getDefault: commands.getDefaultRightSidebarShortcut,
      fallbackDefault: 'CommandOrControl+Shift+Period',
      labelKey: 'preferences.shortcuts.rightSidebarShortcut',
      descriptionKey: 'preferences.shortcuts.rightSidebarShortcutDescription',
    },
  ]

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.shortcuts.globalShortcuts')}>
        {shortcutConfigs.map(config => (
          <ShortcutField
            key={config.key}
            config={config}
            preferences={preferences ?? null}
            disabled={!preferences || savePreferences.isPending}
            onChange={handleShortcutChange}
          />
        ))}
      </SettingsSection>
    </div>
  )
}

function ShortcutField({
  config,
  preferences,
  disabled,
  onChange,
}: {
  config: ShortcutConfig
  preferences: Record<string, unknown> | null
  disabled: boolean
  onChange: (config: ShortcutConfig, shortcut: string | null) => void
}) {
  const { t } = useTranslation()

  const { data: defaultShortcut } = useQuery({
    queryKey: [config.queryKey],
    queryFn: config.getDefault,
    staleTime: Infinity,
  })

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-foreground shrink-0">
        {t(config.labelKey)}
      </span>
      <div className="flex items-center gap-2">
        <ShortcutPicker
          value={(preferences?.[config.key] as string) ?? null}
          defaultValue={defaultShortcut ?? config.fallbackDefault}
          onChange={shortcut => onChange(config, shortcut)}
          disabled={disabled}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
              aria-label={t(config.descriptionKey)}
            >
              <CircleHelp className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t(config.descriptionKey)}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
