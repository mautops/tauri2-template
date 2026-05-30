import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from './forms'

describe('useZodForm', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { name: '', email: '' } })
    )
    expect(result.current.getValues()).toEqual({ name: '', email: '' })
  })

  it('prevents submission with invalid data', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { name: '', email: 'not-an-email' } })
    )

    await act(async () => {
      await result.current.handleSubmit(onSubmit)()
    })

    // onSubmit should NOT be called because validation fails
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows submission with valid data', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() =>
      useZodForm(schema, {
        defaultValues: { name: 'Alice', email: 'alice@example.com' },
      })
    )

    await act(async () => {
      await result.current.handleSubmit(onSubmit)()
    })

    // onSubmit should be called with the form values
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const firstCall = onSubmit.mock.calls[0]
    expect(firstCall).toBeDefined()
    if (firstCall) {
      expect(firstCall[0]).toEqual({
        name: 'Alice',
        email: 'alice@example.com',
      })
    }
  })
})
