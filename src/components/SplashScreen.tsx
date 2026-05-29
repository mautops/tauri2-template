import { useTranslation } from 'react-i18next'
import { LoadingPage } from '@/components/LoadingPage'

export function SplashScreen() {
  const { t } = useTranslation()

  return <LoadingPage message={t('app.name')} size="lg" />
}
