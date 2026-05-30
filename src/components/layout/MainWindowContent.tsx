import { cn } from '@/lib/utils'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  return (
    <main className={cn('flex h-full flex-col bg-background/60', className)}>
      {children}
    </main>
  )
}
