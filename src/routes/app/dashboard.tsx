import { useState, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  FormInput,
  Database,
  Bell,
  BellOff,
  BadgeCheck,
  RotateCw,
  Monitor,
  ArrowRight,
} from 'lucide-react'
import { check } from '@tauri-apps/plugin-updater'
import { isPermissionGranted } from '@tauri-apps/plugin-notification'
import { platform, arch, version } from '@tauri-apps/plugin-os'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/hooks/use-notification'

export const Route = createFileRoute('/app/dashboard')({
  component: DashboardPage,
})

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available'

function NavigatorCards() {
  const { t } = useTranslation()

  const cards = [
    {
      to: '/app/form-demo',
      icon: FormInput,
      title: t('dashboard.navFormDemo'),
      desc: t('dashboard.navFormDemoDesc'),
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      to: '/app/db-demo',
      icon: Database,
      title: t('dashboard.navDbDemo'),
      desc: t('dashboard.navDbDemoDesc'),
      color: 'text-emerald-500 bg-emerald-500/10',
    },
  ] as const

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map(card => (
        <Link
          key={card.to}
          to={card.to}
          className="group flex items-start gap-4 rounded-lg border p-4 hover:border-primary/50 hover:bg-accent/50 transition-colors"
        >
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}
          >
            <card.icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{card.title}</span>
              <ArrowRight className="size-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function StatusOverview() {
  const { t } = useTranslation()
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const { notify } = useNotification()

  const checkNotifications = useCallback(async () => {
    try {
      const granted = await isPermissionGranted()
      setNotifGranted(granted)
    } catch {
      setNotifGranted(false)
    }
  }, [])

  const checkUpdates = useCallback(async () => {
    setUpdateStatus('checking')
    try {
      const update = await check()
      if (update) {
        setUpdateStatus('available')
        setUpdateVersion(update.version)
      } else {
        setUpdateStatus('up-to-date')
      }
    } catch {
      setUpdateStatus('idle')
    }
  }, [])

  const statusColor = (status: boolean | null) => {
    if (status === null) return 'bg-muted-foreground/30'
    return status ? 'bg-emerald-500' : 'bg-amber-500'
  }

  const updateColor = (status: UpdateStatus) => {
    if (status === 'available') return 'bg-emerald-500'
    if (status === 'up-to-date') return 'bg-muted-foreground/40'
    if (status === 'checking') return 'bg-blue-500 animate-pulse'
    return 'bg-muted-foreground/30'
  }

  const osName = (() => {
    try {
      return platform()
    } catch {
      return 'unknown'
    }
  })()
  const osVersion = (() => {
    try {
      return version()
    } catch {
      return ''
    }
  })()
  const osArch = (() => {
    try {
      return arch()
    } catch {
      return ''
    }
  })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('dashboard.status')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkNotifications}
            className="h-7 text-xs"
          >
            <Bell className="mr-1.5 size-3" />
            {t('dashboard.checkPermissions')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={checkUpdates}
            disabled={updateStatus === 'checking'}
            className="h-7 text-xs"
          >
            <RotateCw
              className={`mr-1.5 size-3 ${updateStatus === 'checking' ? 'animate-spin' : ''}`}
            />
            {updateStatus === 'checking'
              ? t('dashboard.checking')
              : t('dashboard.checkUpdate')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Platform */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Monitor className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t('dashboard.platform')}
            </p>
            <p className="text-sm font-medium capitalize truncate">
              {osName} {osVersion} {osArch}
            </p>
          </div>
        </div>

        {/* Notification Permission */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="shrink-0">
            {notifGranted ? (
              <Bell className="size-4 text-emerald-500" />
            ) : (
              <BellOff className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t('dashboard.notificationPermission')}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`size-1.5 rounded-full ${statusColor(notifGranted)}`}
              />
              <span className="text-sm">
                {notifGranted === null
                  ? t('dashboard.unknown')
                  : notifGranted
                    ? t('dashboard.granted')
                    : t('dashboard.denied')}
              </span>
            </div>
          </div>
        </div>

        {/* Update Status */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          {updateStatus === 'available' ? (
            <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
          ) : (
            <RotateCw
              className={`size-4 text-muted-foreground shrink-0 ${updateStatus === 'checking' ? 'animate-spin' : ''}`}
            />
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {t('dashboard.updateStatus')}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`size-1.5 rounded-full ${updateColor(updateStatus)}`}
              />
              <span className="text-sm">
                {updateStatus === 'idle' && t('dashboard.notChecked')}
                {updateStatus === 'checking' && t('dashboard.checking')}
                {updateStatus === 'up-to-date' && t('dashboard.upToDate')}
                {updateStatus === 'available' &&
                  t('dashboard.updateAvailable', {
                    version: updateVersion ?? '',
                  })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick notification test */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          notify(t('dashboard.notificationTitle'), {
            body: t('dashboard.notificationBody'),
            native: notifGranted ?? false,
            type: 'info',
          })
        }
        className="h-7 text-xs"
      >
        <Bell className="mr-1.5 size-3" />
        {t('dashboard.testNotification')}
      </Button>
    </div>
  )
}

function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('dashboard.description')}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('dashboard.quickNav')}
        </h2>
        <NavigatorCards />
      </div>

      <StatusOverview />
    </div>
  )
}
