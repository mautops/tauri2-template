import { cn } from '@/lib/utils'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function LeftSideBar({ children, className }: LeftSideBarProps) {
  return (
    <aside
      className={cn('flex h-full flex-col border-r glass', className)}
      aria-label="Left sidebar"
    >
      {children}
    </aside>
  )
}
