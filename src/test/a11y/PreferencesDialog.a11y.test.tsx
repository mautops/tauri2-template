import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { useUIStore } from '@/store/ui-store'
import { queryClient } from '@/lib/query-client'

describe('PreferencesDialog accessibility', () => {
  it('has no a11y violations when open', async () => {
    // Open the dialog via store state
    useUIStore.getState().setPreferencesOpen(true)
    render(
      <QueryClientProvider client={queryClient}>
        <PreferencesDialog />
      </QueryClientProvider>
    )
    // Dialog renders in a Radix portal → test document.body
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })
})
