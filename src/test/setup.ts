import '@testing-library/jest-dom'
import { vi, expect } from 'vitest'
// vitest-axe 0.1.0: the `/matchers` subpath has a buggy .d.ts (export type *).
// Import from dist directly for the matcher function, and import extend-expect
// for the Vi namespace type augmentation.
import 'vitest-axe/extend-expect'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers'

expect.extend({ toHaveNoViolations })

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Tauri APIs for tests
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {
    // Mock unlisten function
  }),
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn().mockReturnValue({
    onDragDropEvent: vi.fn().mockResolvedValue(() => {
      // Mock unlisten function
    }),
  }),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockResolvedValue(null),
}))

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockReturnValue('macos'),
  locale: vi.fn().mockReturnValue('en-US'),
  type: vi.fn().mockReturnValue('macos'),
}))

vi.mock('@/store/auth-store', () => {
  const authState = {
    isAuthenticated: true,
    username: 'test-user',
    login: vi.fn().mockReturnValue(true),
    logout: vi.fn(),
  }

  const useAuthStore: ReturnType<typeof vi.fn> & {
    getState: ReturnType<typeof vi.fn>
  } = Object.assign(
    vi
      .fn()
      .mockImplementation((selector?: (s: typeof authState) => unknown) => {
        return selector ? selector(authState) : authState
      }),
    { getState: vi.fn().mockReturnValue(authState) }
  )

  return { useAuthStore }
})

vi.mock('@tauri-apps/api/menu', () => {
  // Minimal mock objects that satisfy the Menu API surface used in tests
  const menuItem = vi.fn().mockResolvedValue({})
  const submenu = vi.fn().mockResolvedValue({})
  const predefinedMenuItem = vi.fn().mockResolvedValue({})

  const menuInstance = {
    setAsAppMenu: vi.fn().mockResolvedValue(undefined),
    popup: vi.fn().mockResolvedValue(undefined),
  }

  return {
    Menu: {
      new: vi.fn().mockResolvedValue(menuInstance),
    },
    MenuItem: {
      new: menuItem,
    },
    Submenu: {
      new: submenu,
    },
    PredefinedMenuItem: {
      new: predefinedMenuItem,
    },
  }
})

// Mock typed Tauri bindings (tauri-specta generated)
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    greet: vi.fn().mockResolvedValue('Hello, test!'),
    loadPreferences: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { theme: 'system' } }),
    savePreferences: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    sendNativeNotification: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: null }),
    saveEmergencyData: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    loadEmergencyData: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    cleanupOldRecoveryFiles: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: 0 }),
  },
  unwrapResult: vi.fn((result: { status: string; data?: unknown }) => {
    if (result.status === 'ok') return result.data
    throw result
  }),
}))
