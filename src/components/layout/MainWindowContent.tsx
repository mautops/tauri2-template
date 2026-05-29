import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { platform } from '@tauri-apps/plugin-os'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  const lastQuickPaneEntry = useUIStore(state => state.lastQuickPaneEntry)
  const modifierKey = platform() === 'macos' ? 'Cmd' : 'Ctrl'

  return (
    <main className={cn('flex h-full flex-col bg-background/60', className)}>
      {children || (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {lastQuickPaneEntry ? (
            <h1 className="text-4xl font-bold text-foreground">
              Last entry: {lastQuickPaneEntry}
            </h1>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-4xl font-bold text-foreground">
                Welcome to Tauri App
              </h1>
              <p className="text-muted-foreground max-w-md">
                Press{' '}
                <kbd className="px-2 py-0.5 text-xs bg-muted border rounded font-mono">
                  {modifierKey}+K
                </kbd>{' '}
                to search commands, or{' '}
                <kbd className="px-2 py-0.5 text-xs bg-muted border rounded font-mono">
                  {modifierKey}+Shift+P
                </kbd>{' '}
                to open the quick pane.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
