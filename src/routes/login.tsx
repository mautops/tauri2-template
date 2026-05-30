import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoginPage } from '@/components/auth/LoginPage'
import { useAuthStore } from '@/store/auth-store'
import { useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginRoute,
})

function LoginRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/app/dashboard' })
    }
  }, [isAuthenticated, navigate])

  return <LoginPage />
}
