import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface QuickPaneEntry {
  id: string
  text: string
  timestamp: number
}

const MAX_QUICK_PANE_ENTRIES = 50
const MAX_ENTRY_LENGTH = 80

interface UIState {
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  quickPaneEntries: QuickPaneEntry[]
  recentCommands: { id: string; labelKey: string; timestamp: number }[]

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  addQuickPaneEntry: (text: string) => void
  clearQuickPaneEntries: () => void
  setSquareCorners: (enabled: boolean) => void
  addRecentCommand: (id: string, labelKey: string) => void
}

export { MAX_ENTRY_LENGTH }

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      rightSidebarVisible: true,
      commandPaletteOpen: false,
      preferencesOpen: false,
      quickPaneEntries: [],
      recentCommands: [],

      toggleLeftSidebar: () =>
        set(
          state => ({ leftSidebarVisible: !state.leftSidebarVisible }),
          undefined,
          'toggleLeftSidebar'
        ),

      setLeftSidebarVisible: visible =>
        set(
          { leftSidebarVisible: visible },
          undefined,
          'setLeftSidebarVisible'
        ),

      toggleRightSidebar: () =>
        set(
          state => ({ rightSidebarVisible: !state.rightSidebarVisible }),
          undefined,
          'toggleRightSidebar'
        ),

      setRightSidebarVisible: visible =>
        set(
          { rightSidebarVisible: visible },
          undefined,
          'setRightSidebarVisible'
        ),

      toggleCommandPalette: () =>
        set(
          state => ({ commandPaletteOpen: !state.commandPaletteOpen }),
          undefined,
          'toggleCommandPalette'
        ),

      setCommandPaletteOpen: open =>
        set({ commandPaletteOpen: open }, undefined, 'setCommandPaletteOpen'),

      togglePreferences: () =>
        set(
          state => ({ preferencesOpen: !state.preferencesOpen }),
          undefined,
          'togglePreferences'
        ),

      setPreferencesOpen: open =>
        set({ preferencesOpen: open }, undefined, 'setPreferencesOpen'),

      addQuickPaneEntry: text =>
        set(
          state => ({
            quickPaneEntries: [
              {
                id: crypto.randomUUID(),
                text:
                  text.length > MAX_ENTRY_LENGTH
                    ? text.slice(0, MAX_ENTRY_LENGTH)
                    : text,
                timestamp: Date.now(),
              },
              ...state.quickPaneEntries,
            ].slice(0, MAX_QUICK_PANE_ENTRIES),
          }),
          undefined,
          'addQuickPaneEntry'
        ),

      clearQuickPaneEntries: () =>
        set({ quickPaneEntries: [] }, undefined, 'clearQuickPaneEntries'),

      setSquareCorners: (enabled: boolean) => {
        document.documentElement.classList.toggle('square-corners', enabled)
      },

      addRecentCommand: (id, labelKey) =>
        set(
          state => ({
            recentCommands: [
              { id, labelKey, timestamp: Date.now() },
              ...state.recentCommands.filter(c => c.id !== id),
            ].slice(0, 5),
          }),
          undefined,
          'addRecentCommand'
        ),
    }),
    {
      name: 'ui-store',
    }
  )
)
