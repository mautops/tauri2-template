import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { usePreferences } from '@/services/preferences'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface NotifyOptions {
  type?: NotificationType
  body?: string
  native?: boolean
  duration?: number
}

export function useNotification() {
  const { data: preferences } = usePreferences()
  const notificationsEnabled = preferences?.notifications_enabled ?? true

  const requestNativePermission = useCallback(async (): Promise<boolean> => {
    try {
      let granted = await isPermissionGranted()
      if (!granted) {
        const permission = await requestPermission()
        granted = permission === 'granted'
      }
      return granted
    } catch (e) {
      logger.warn('Failed to request notification permission', {
        error: String(e),
      })
      return false
    }
  }, [])

  const notify = useCallback(
    async (title: string, options: NotifyOptions = {}) => {
      const { type = 'info', body, native = false, duration } = options

      if (!notificationsEnabled) return

      if (native) {
        const hasPermission = await requestNativePermission()
        if (hasPermission) {
          try {
            await commands.sendNativeNotification(title, body ?? null)
            return
          } catch (e) {
            logger.warn('Native notification failed, falling back to toast', {
              error: String(e),
            })
          }
        }
      }

      // Toast fallback using sonner
      const toastOptions = { description: body, duration }
      switch (type) {
        case 'success':
          toast.success(title, toastOptions)
          break
        case 'error':
          toast.error(title, toastOptions)
          break
        case 'warning':
          toast.warning(title, toastOptions)
          break
        default:
          toast.info(title, toastOptions)
      }
    },
    [notificationsEnabled, requestNativePermission]
  )

  return { notify, notificationsEnabled }
}
