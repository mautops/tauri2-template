import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleHelp, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { logger } from '@/lib/logger'
import { SettingsSection } from '../shared/SettingsComponents'

export function AdvancedPane() {
  const { t } = useTranslation()
  const [exampleAdvancedToggle, setExampleAdvancedToggle] = useState(false)
  const [exampleDropdown, setExampleDropdown] = useState('option1')
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  const handleExport = async () => {
    if (!preferences) return

    try {
      const filePath = await save({
        defaultPath: 'preferences.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })

      if (!filePath) return

      const json = JSON.stringify(preferences, null, 2)
      await writeTextFile(filePath, json)
      toast.success(t('preferences.advanced.exportSuccess'))
    } catch (error) {
      logger.error('Failed to export preferences', { error })
      toast.error(t('toast.error.generic'))
    }
  }

  const handleImport = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })

      if (!selected) return

      const filePath = selected as string
      const json = await readTextFile(filePath)
      const parsed = JSON.parse(json)

      savePreferences.mutate(parsed)
      toast.success(t('preferences.advanced.importSuccess'))
    } catch (error) {
      logger.error('Failed to import preferences', { error })
      toast.error(t('preferences.advanced.importFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.advanced.title')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.advanced.toggle')}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="example-advanced-toggle"
                checked={exampleAdvancedToggle}
                onCheckedChange={setExampleAdvancedToggle}
              />
              <Label
                htmlFor="example-advanced-toggle"
                className="text-sm text-muted-foreground"
              >
                {exampleAdvancedToggle
                  ? t('common.enabled')
                  : t('common.disabled')}
              </Label>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.advanced.toggleDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.advanced.toggleDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.advanced.dropdown')}
          </span>
          <div className="flex items-center gap-2">
            <Select value={exampleDropdown} onValueChange={setExampleDropdown}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">
                  {t('preferences.advanced.option1')}
                </SelectItem>
                <SelectItem value="option2">
                  {t('preferences.advanced.option2')}
                </SelectItem>
                <SelectItem value="option3">
                  {t('preferences.advanced.option3')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.advanced.dropdownDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.advanced.dropdownDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('preferences.advanced.configManagement')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.advanced.exportConfig')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!preferences || savePreferences.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('preferences.advanced.exportConfig')}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.advanced.exportConfigDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.advanced.exportConfigDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.advanced.importConfig')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              disabled={savePreferences.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('preferences.advanced.importConfig')}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.advanced.importConfigDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.advanced.importConfigDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
