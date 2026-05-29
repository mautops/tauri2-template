import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

interface UseFileDropOptions {
  onDrop: (paths: string[]) => void
  onHover?: () => void
  onLeave?: () => void
}

export function useFileDrop({ onDrop, onHover, onLeave }: UseFileDropOptions) {
  const onDropRef = useRef(onDrop)
  const onHoverRef = useRef(onHover)
  const onLeaveRef = useRef(onLeave)

  // Sync refs in effect to comply with React Compiler (no ref writes during render)
  useEffect(() => {
    onDropRef.current = onDrop
    onHoverRef.current = onHover
    onLeaveRef.current = onLeave
  })

  useEffect(() => {
    const appWindow = getCurrentWindow()
    let aborted = false
    let unlisten: (() => void) | undefined

    const setupPromise = (async () => {
      unlisten = await appWindow.onDragDropEvent(event => {
        if (aborted) return

        switch (event.payload.type) {
          case 'drop':
            onDropRef.current(event.payload.paths)
            break
          case 'over':
            onHoverRef.current?.()
            break
          case 'leave':
            onLeaveRef.current?.()
            break
        }
      })
    })()

    setupPromise.catch(() => {
      // Drag-drop not supported or window not ready
    })

    return () => {
      aborted = true
      setupPromise
        .then(() => {
          if (unlisten) unlisten()
        })
        .catch(() => {
          // Ignore cleanup errors
        })
    }
  }, []) // Stable: only mount/unmount once
}
