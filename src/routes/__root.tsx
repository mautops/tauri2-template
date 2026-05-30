import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { env } from '@/env'

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <ThemeProvider>
        <Outlet />
        {env.ENABLE_DEVTOOLS && import.meta.env.DEV && (
          <TanStackRouterDevtools />
        )}
      </ThemeProvider>
    </ErrorBoundary>
  ),
})
