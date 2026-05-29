import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { MainWindow } from '@/components/layout/MainWindow'

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockReturnValue('macos'),
}))

describe('MainWindow accessibility', () => {
  it('has no a11y violations', async () => {
    render(<MainWindow />)
    const results = await axe(document.body, {
      rules: {
        // Radix UI portals render dialog content outside main landmarks,
        // which triggers false positives for the region rule.
        region: { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})
