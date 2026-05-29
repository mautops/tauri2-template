import { useTranslation } from 'react-i18next'
import { locale } from '@tauri-apps/plugin-os'
import { toast } from 'sonner'
import { useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/use-theme'
import { SettingsSection } from '../shared/SettingsComponents'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { availableLanguages } from '@/i18n'
import { logger } from '@/lib/logger'

type ColorScheme = 'supabase' | 'vercel' | 'linear' | 'stripe'

const colorSchemes: {
  id: ColorScheme
  labelKey: string
  descriptionKey: string
  colors: string[]
}[] = [
  {
    id: 'supabase',
    labelKey: 'preferences.appearance.colorScheme.supabase',
    descriptionKey: 'preferences.appearance.colorScheme.supabaseDescription',
    colors: ['#1a2e26', '#3ecf8e'],
  },
  {
    id: 'vercel',
    labelKey: 'preferences.appearance.colorScheme.vercel',
    descriptionKey: 'preferences.appearance.colorScheme.vercelDescription',
    colors: ['#000000', '#ffffff'],
  },
  {
    id: 'linear',
    labelKey: 'preferences.appearance.colorScheme.linear',
    descriptionKey: 'preferences.appearance.colorScheme.linearDescription',
    colors: ['#1c1e26', '#5e6ad2'],
  },
  {
    id: 'stripe',
    labelKey: 'preferences.appearance.colorScheme.stripe',
    descriptionKey: 'preferences.appearance.colorScheme.stripeDescription',
    colors: ['#1a1b3a', '#635bff'],
  },
]

// Language display names (native names)
const languageNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
}

export function AppearancePane() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value)

    if (preferences) {
      savePreferences.mutate({ ...preferences, theme: value })
    }
  }

  const handleColorSchemeChange = (value: ColorScheme) => {
    if (!preferences) return

    const root = document.documentElement
    root.setAttribute('data-color-scheme', value)

    savePreferences.mutate({ ...preferences, color_scheme: value })
  }

  const handleLanguageChange = async (value: string) => {
    const language = value === 'system' ? null : value

    try {
      if (language) {
        await i18n.changeLanguage(language)
      } else {
        const systemLocale = await locale()
        const langCode = systemLocale?.split('-')[0]?.toLowerCase() ?? 'en'
        const targetLang = availableLanguages.includes(langCode)
          ? langCode
          : 'en'
        await i18n.changeLanguage(targetLang)
      }
    } catch (error) {
      logger.error('Failed to change language', { error })
      toast.error(t('toast.error.generic'))
      return
    }

    if (preferences) {
      savePreferences.mutate({ ...preferences, language })
    }
  }

  const glassOpacityRef = useRef(preferences?.glass_opacity ?? 0.72)
  const [glassDisplay, setGlassDisplay] = useState<number | null>(null)

  const handleGlassOpacityInput = (value: number) => {
    glassOpacityRef.current = value
    setGlassDisplay(value)
    const root = document.documentElement
    root.style.setProperty('--glass-opacity', String(value))
    root.style.setProperty(
      '--glass-opacity-dark',
      String(Math.min(1, value + 0.06))
    )
  }

  const handleGlassOpacityCommit = () => {
    if (!preferences) return
    savePreferences.mutate({
      ...preferences,
      glass_opacity: glassOpacityRef.current,
    })
  }

  const currentLanguageValue = preferences?.language ?? 'system'

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.appearance.language')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.appearance.language')}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={currentLanguageValue}
              onValueChange={handleLanguageChange}
              disabled={savePreferences.isPending}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  {t('preferences.appearance.language.system')}
                </SelectItem>
                {availableLanguages.map(lang => (
                  <SelectItem key={lang} value={lang}>
                    {languageNames[lang] ?? lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.appearance.languageDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.appearance.languageDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('preferences.appearance.glassOpacity')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.appearance.glassOpacity')}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.01"
              key={preferences?.glass_opacity ?? 0.72}
              defaultValue={preferences?.glass_opacity ?? 0.72}
              onChange={e =>
                handleGlassOpacityInput(parseFloat(e.currentTarget.value))
              }
              onMouseUp={handleGlassOpacityCommit}
              onTouchEnd={handleGlassOpacityCommit}
              disabled={!preferences || savePreferences.isPending}
              className="h-2 w-32 appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
            />
            <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">
              {Math.round(
                (glassDisplay ?? preferences?.glass_opacity ?? 0.72) * 100
              )}
              %
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t(
                    'preferences.appearance.glassOpacityDescription'
                  )}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.appearance.glassOpacityDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('preferences.appearance.theme')}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground shrink-0">
            {t('preferences.appearance.colorTheme')}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={theme}
              onValueChange={handleThemeChange}
              disabled={savePreferences.isPending}
            >
              <SelectTrigger className="w-32">
                <SelectValue
                  placeholder={t('preferences.appearance.selectTheme')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  {t('preferences.appearance.theme.light')}
                </SelectItem>
                <SelectItem value="dark">
                  {t('preferences.appearance.theme.dark')}
                </SelectItem>
                <SelectItem value="system">
                  {t('preferences.appearance.theme.system')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                  aria-label={t('preferences.appearance.colorThemeDescription')}
                >
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('preferences.appearance.colorThemeDescription')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('preferences.appearance.colorScheme')}>
        <div className="space-y-1">
          {colorSchemes.map(scheme => {
            const isSelected =
              (preferences?.color_scheme ?? 'supabase') === scheme.id

            return (
              <button
                key={scheme.id}
                type="button"
                disabled={!preferences || savePreferences.isPending}
                onClick={() => handleColorSchemeChange(scheme.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-accent ring-1 ring-primary'
                )}
              >
                <span className="text-sm font-medium">
                  {t(scheme.labelKey)}
                </span>
                <div className="flex shrink-0 -space-x-1">
                  {scheme.colors.map((color, i) => (
                    <div
                      key={color}
                      className={cn(
                        'size-5 rounded-full border-2 border-background',
                        i === 0 && 'size-6'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </SettingsSection>
    </div>
  )
}
