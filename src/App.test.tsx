import { render, screen, waitFor } from '@/test/test-utils'
import { describe, it, expect } from 'vitest'
import App from './App'

// Tauri bindings are mocked globally in src/test/setup.ts

describe('App', () => {
  it('renders main window layout', async () => {
    render(<App />)
    // Wait for SplashScreen transition (600ms delay + async init), then verify MainWindow
    await waitFor(
      () => {
        expect(
          screen.getByText(`Tauri App v${__APP_VERSION__}`)
        ).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('renders title bar with traffic light buttons', async () => {
    render(<App />)
    await waitFor(
      () => {
        const titleBarButtons = screen
          .getAllByRole('button')
          .filter(
            button =>
              button.getAttribute('aria-label')?.includes('window') ||
              button.className.includes('window-control')
          )
        expect(titleBarButtons.length).toBeGreaterThan(0)
      },
      { timeout: 2000 }
    )
  })
})
