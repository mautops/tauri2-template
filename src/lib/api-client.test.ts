import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('makes GET request with correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'Alice' }),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com')
    const result = await client.get<{ id: number; name: string }>('/users/1')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual({ id: 1, name: 'Alice' })
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'User not found' }),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com')

    await expect(client.get('/users/999')).rejects.toThrow('User not found')
  })

  it('makes POST request with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, name: 'Bob' }),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com')
    await client.post('/users', { name: 'Bob' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Bob' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('accepts request timeout via AbortSignal', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com', { timeout: 5000 })
    await client.get('/test')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})
