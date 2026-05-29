import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import type { ImperativePanelHandle } from 'react-resizable-panels'
import { TitleBar } from '@/components/titlebar/TitleBar'
import { LeftSideBar } from './LeftSideBar'
import { RightSideBar } from './RightSideBar'
import { MainWindowContent } from './MainWindowContent'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Toaster, toast } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'
import { cn } from '@/lib/utils'
import { useFileDrop } from '@/hooks/useFileDrop'
import { Upload } from 'lucide-react'

/**
 * Layout sizing configuration for resizable panels.
 * All values are percentages of total width.
 * Sidebar defaults + main default must equal 100.
 */
const LAYOUT = {
  leftSidebar: { default: 20, min: 15, max: 40 },
  rightSidebar: { default: 20, min: 15, max: 40 },
  main: { min: 30 },
} as const

// Main content default is calculated to ensure totals sum to 100%
const MAIN_CONTENT_DEFAULT =
  100 - LAYOUT.leftSidebar.default - LAYOUT.rightSidebar.default

function safeResize(panel: ImperativePanelHandle | null, size: number) {
  if (!panel) return
  try {
    panel.resize(size)
  } catch {
    requestAnimationFrame(() => {
      try {
        panel.resize(size)
      } catch {
        // Panel not yet registered with group; defaultSize handles initial layout
      }
    })
  }
}

export function MainWindow() {
  const { theme } = useTheme()
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
  const rightSidebarVisible = useUIStore(state => state.rightSidebarVisible)
  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const rightPanelRef = useRef<ImperativePanelHandle>(null)

  // Set up global event listeners (keyboard shortcuts, etc.)
  useMainWindowEventListeners()

  useEffect(() => {
    safeResize(
      leftPanelRef.current,
      leftSidebarVisible ? LAYOUT.leftSidebar.default : 0
    )
  }, [leftSidebarVisible])

  useEffect(() => {
    safeResize(
      rightPanelRef.current,
      rightSidebarVisible ? LAYOUT.rightSidebar.default : 0
    )
  }, [rightSidebarVisible])

  const [isDragging, setIsDragging] = useState(false)

  useFileDrop({
    onDrop: paths => {
      setIsDragging(false)
      toast.success(
        `Dropped ${paths.length} file${paths.length !== 1 ? 's' : ''}`,
        {
          description: paths.map(p => p.split('/').pop() || p).join(', '),
        }
      )
    },
    onHover: () => setIsDragging(true),
    onLeave: () => setIsDragging(false),
  })

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden rounded-[var(--app-corner-radius)] glass">
      <TitleBar />

      {/* Screen reader announcements for route/page changes */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="page-announcer"
      />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            ref={leftPanelRef}
            defaultSize={LAYOUT.leftSidebar.default}
            minSize={0}
            maxSize={LAYOUT.leftSidebar.max}
            className="transition-[flex] duration-200 ease-out"
          >
            <div className="h-full overflow-hidden">
              <AnimatePresence>
                {leftSidebarVisible && (
                  <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="h-full"
                  >
                    <LeftSideBar />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ResizablePanel>

          <ResizableHandle
            className={cn(
              !leftSidebarVisible && 'opacity-0',
              'transition-opacity duration-200'
            )}
            aria-valuenow={20}
            aria-valuemin={0}
            aria-valuemax={100}
          />

          <ResizablePanel
            defaultSize={MAIN_CONTENT_DEFAULT}
            minSize={LAYOUT.main.min}
          >
            <MainWindowContent />
          </ResizablePanel>

          <ResizableHandle
            className={cn(
              !rightSidebarVisible && 'opacity-0',
              'transition-opacity duration-200'
            )}
            aria-valuenow={80}
            aria-valuemin={0}
            aria-valuemax={100}
          />

          <ResizablePanel
            ref={rightPanelRef}
            defaultSize={LAYOUT.rightSidebar.default}
            minSize={0}
            maxSize={LAYOUT.rightSidebar.max}
            className="transition-[flex] duration-200 ease-out"
          >
            <div className="h-full overflow-hidden">
              <AnimatePresence>
                {rightSidebarVisible && (
                  <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="h-full"
                  >
                    <RightSideBar />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Global UI Components (hidden until triggered) */}
      <CommandPalette />
      <PreferencesDialog />
      <Toaster
        position="bottom-right"
        theme={
          theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'
        }
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton:
              'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
      />

      {/* File drop zone overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-[var(--app-corner-radius)] pointer-events-none"
          aria-label="Drop files to upload"
        >
          <div className="flex flex-col items-center gap-3 text-primary">
            <Upload className="h-10 w-10" />
            <span className="text-lg font-medium">Drop files here</span>
          </div>
        </div>
      )}
    </div>
  )
}
