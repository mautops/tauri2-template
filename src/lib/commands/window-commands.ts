import type { AppCommand } from './types'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import i18n from '@/i18n/config'

export const windowCommands: AppCommand[] = [
  {
    id: 'window-close',
    labelKey: 'commands.windowClose.label',
    descriptionKey: 'commands.windowClose.description',
    shortcut: '⌘+W',

    execute: async context => {
      try {
        const appWindow = getCurrentWindow()
        await appWindow.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        context.showToast(
          i18n.t('toast.error.windowCloseFailed', { message }),
          'error'
        )
      }
    },
  },

  {
    id: 'window-minimize',
    labelKey: 'commands.windowMinimize.label',
    descriptionKey: 'commands.windowMinimize.description',
    shortcut: '⌘+M',

    execute: async context => {
      try {
        const appWindow = getCurrentWindow()
        await appWindow.minimize()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        context.showToast(
          i18n.t('toast.error.windowMinimizeFailed', { message }),
          'error'
        )
      }
    },
  },

  {
    id: 'window-toggle-maximize',
    labelKey: 'commands.windowToggleMaximize.label',
    descriptionKey: 'commands.windowToggleMaximize.description',

    execute: async context => {
      try {
        const appWindow = getCurrentWindow()
        await appWindow.toggleMaximize()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        context.showToast(
          i18n.t('toast.error.windowMaximizeFailed', { message }),
          'error'
        )
      }
    },
  },

  {
    id: 'window-fullscreen',
    labelKey: 'commands.windowFullscreen.label',
    descriptionKey: 'commands.windowFullscreen.description',
    shortcut: 'F11',

    execute: async context => {
      try {
        const appWindow = getCurrentWindow()
        await appWindow.setFullscreen(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        context.showToast(
          i18n.t('toast.error.fullscreenEnterFailed', { message }),
          'error'
        )
      }
    },
  },

  {
    id: 'window-exit-fullscreen',
    labelKey: 'commands.windowExitFullscreen.label',
    descriptionKey: 'commands.windowExitFullscreen.description',
    shortcut: 'Escape',

    execute: async context => {
      try {
        const appWindow = getCurrentWindow()
        await appWindow.setFullscreen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        context.showToast(
          i18n.t('toast.error.fullscreenExitFailed', { message }),
          'error'
        )
      }
    },
  },

  {
    id: 'window-open-new',
    labelKey: 'commands.windowOpenNew.label',
    descriptionKey: 'commands.windowOpenNew.description',
    group: 'window',

    execute: async context => {
      try {
        const webview = new WebviewWindow('extra-' + Date.now(), {
          url: '/',
          title: 'Tauri App',
          width: 1000,
          height: 700,
        })

        webview.once('tauri://created', () => {
          context.showToast(
            i18n.t('toast.success.windowOpened', 'New window opened'),
            'success'
          )
        })
        webview.once('tauri://error', e => {
          context.showToast(
            i18n.t('toast.error.windowOpenFailed', { message: String(e) }),
            'error'
          )
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        context.showToast(
          i18n.t('toast.error.windowOpenFailed', { message }),
          'error'
        )
      }
    },
  },
]
