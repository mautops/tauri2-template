import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses default values when env vars are not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_API_TIMEOUT_MS', '')
    vi.stubEnv('VITE_ENABLE_DEVTOOLS', '')
    vi.stubEnv('VITE_ENABLE_MOCK_API', '')
    vi.stubEnv('VITE_APP_ENV', '')

    const { env } = await import('./env')
    expect(env.API_BASE_URL).toBe('')
    expect(env.API_TIMEOUT_MS).toBe(10000)
    expect(env.ENABLE_DEVTOOLS).toBe(false)
    expect(env.ENABLE_MOCK_API).toBe(false)
    expect(env.APP_ENV).toBe('development')
  })

  it('parses string booleans correctly', async () => {
    vi.stubEnv('VITE_ENABLE_DEVTOOLS', 'true')
    vi.stubEnv('VITE_ENABLE_MOCK_API', 'false')

    const { env } = await import('./env')
    expect(env.ENABLE_DEVTOOLS).toBe(true)
    expect(env.ENABLE_MOCK_API).toBe(false)
  })

  it('parses numeric string correctly', async () => {
    vi.stubEnv('VITE_API_TIMEOUT_MS', '5000')

    const { env } = await import('./env')
    expect(env.API_TIMEOUT_MS).toBe(5000)
  })

  it('throws on invalid numeric value', async () => {
    vi.stubEnv('VITE_API_TIMEOUT_MS', 'not-a-number')

    await expect(import('./env')).rejects.toThrow()
  })
})
