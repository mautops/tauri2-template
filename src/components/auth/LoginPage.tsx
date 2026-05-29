import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-destructive"
    >
      {message}
    </motion.p>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const login = useAuthStore(state => state.login)

  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const success = login(username, password)
    if (!success) {
      setError(t('login.error.invalid'))
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }

  return (
    <div
      className={cn(
        'relative flex h-screen w-full flex-col overflow-hidden rounded-[var(--app-corner-radius)]',
        'bg-transparent text-foreground'
      )}
    >
      <div data-tauri-drag-region className="h-10 w-full shrink-0" />

      {/* Subtle background blur targets — barely visible, blurred by the card */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 -top-20 size-48 rounded-full bg-primary/5"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 size-56 rounded-full bg-primary/4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3"
          animate={{ scale: [0.9, 1.15, 0.9] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={
            shake
              ? { x: [0, -8, 8, -8, 8, 0], opacity: 1, y: 0, scale: 0.97 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={
            shake ? { duration: 0.4 } : { duration: 0.4, ease: 'easeOut' }
          }
          className="w-full max-w-sm space-y-6 rounded-xl border glass p-8 shadow-lg text-card-foreground"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2 text-center"
          >
            <motion.h1
              variants={itemVariants}
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              {t('login.title')}
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-sm text-muted-foreground"
            >
              {t('login.subtitle', { appName: t('app.name') })}
            </motion.p>
          </motion.div>

          <motion.form
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="username">{t('login.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={e => {
                  setUsername(e.target.value)
                  setError('')
                }}
                required
              />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="admin"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setError('')
                }}
                required
              />
            </motion.div>

            <AnimatePresence>
              {error && <ErrorMessage message={error} />}
            </AnimatePresence>

            <motion.div variants={itemVariants}>
              <Button type="submit" className="w-full">
                {t('login.submit')}
              </Button>
            </motion.div>
          </motion.form>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <motion.div variants={itemVariants} className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background/60 px-2 text-muted-foreground">
                  {t('login.sso.or')}
                </span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled
                onClick={() => toast(t('login.sso.comingSoon'))}
              >
                {t('login.sso.keycloak')}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
