import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useCommandContext } from './use-command-context'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'
import { useUIStore } from '@/store/ui-store'
import { logger } from '@/lib/logger'

/**
 * Main window event listeners - handles global keyboard shortcuts and cross-window events.
 *
 * This hook composes specialized hooks for different event types:
 * - useKeyboardShortcuts: Global keyboard shortcuts (Cmd+, Cmd+1, Cmd+2)
 * - Quick pane submit listener: Cross-window communication from quick pane
 */
export function useMainWindowEventListeners() {
  const commandContext = useCommandContext()

  useKeyboardShortcuts(commandContext)

  // Listen for quick pane submissions (cross-window event)
  useEffect(() => {
    let isMounted = true
    let unlisten: (() => void) | null = null

    listen<{ text: string }>('quick-pane-submit', event => {
      logger.debug('Quick pane submit event received', {
        text: event.payload.text,
      })
      const { setLastQuickPaneEntry } = useUIStore.getState()
      setLastQuickPaneEntry(event.payload.text)
    })
      .then(unlistenFn => {
        if (!isMounted) {
          unlistenFn()
        } else {
          unlisten = unlistenFn
        }
      })
      .catch(error => {
        logger.error('Failed to setup quick-pane-submit listener', { error })
      })

    return () => {
      isMounted = false
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  // Listen for sidebar toggle events from global shortcuts
  useEffect(() => {
    let isMounted = true
    let unlistenLeft: (() => void) | null = null
    let unlistenRight: (() => void) | null = null

    Promise.all([
      listen('toggle-left-sidebar', () => {
        logger.debug('Toggle left sidebar event received')
        const { toggleLeftSidebar } = useUIStore.getState()
        toggleLeftSidebar()
      }),
      listen('toggle-right-sidebar', () => {
        logger.debug('Toggle right sidebar event received')
        const { toggleRightSidebar } = useUIStore.getState()
        toggleRightSidebar()
      }),
    ])
      .then(([unlistenLeftFn, unlistenRightFn]) => {
        if (!isMounted) {
          unlistenLeftFn()
          unlistenRightFn()
        } else {
          unlistenLeft = unlistenLeftFn
          unlistenRight = unlistenRightFn
        }
      })
      .catch(error => {
        logger.error('Failed to setup sidebar toggle listeners', { error })
      })

    return () => {
      isMounted = false
      if (unlistenLeft) unlistenLeft()
      if (unlistenRight) unlistenRight()
    }
  }, [])
}
