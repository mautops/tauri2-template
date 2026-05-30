import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    sendNativeNotification: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: null }),
    loadPreferences: vi.fn().mockResolvedValue({
      status: 'ok',
      data: {
        theme: 'system',
        color_scheme: 'supabase',
        glass_opacity: 0.72,
        notifications_enabled: true,
        quick_pane_shortcut: null,
        left_sidebar_shortcut: null,
        right_sidebar_shortcut: null,
        language: null,
      },
    }),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn().mockResolvedValue(true),
  requestPermission: vi.fn().mockResolvedValue('granted'),
}))

// Mock TanStack Query
vi.mock('@/services/preferences', () => ({
  usePreferences: vi.fn().mockReturnValue({
    data: { notifications_enabled: true },
  }),
}))

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends native notification when options.native is true', async () => {
    const { commands } = await import('@/lib/tauri-bindings')
    const { useNotification } = await import('./use-notification')

    const { result } = renderHook(() => useNotification())

    await act(async () => {
      await result.current.notify('Test Title', { native: true })
    })

    expect(commands.sendNativeNotification).toHaveBeenCalledWith(
      'Test Title',
      null
    )
  })

  it('falls back to toast when native notification fails', async () => {
    const { commands } = await import('@/lib/tauri-bindings')
    vi.mocked(commands.sendNativeNotification).mockRejectedValueOnce(
      new Error('Permission denied')
    )

    const { toast } = await import('sonner')
    const { useNotification } = await import('./use-notification')

    const { result } = renderHook(() => useNotification())

    await act(async () => {
      await result.current.notify('Test Title', { native: true })
    })

    expect(toast.info).toHaveBeenCalledWith('Test Title', expect.any(Object))
  })
})
