import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth-store'
import { MainWindow } from '@/components/layout/MainWindow'

export const Route = createFileRoute('/app')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <MainWindow>
      <Outlet />
    </MainWindow>
  )
}
