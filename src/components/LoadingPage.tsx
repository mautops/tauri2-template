import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface LoadingPageProps {
  message?: string
  variant?: 'fullscreen' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { ring: 'size-8', dot: 'size-1.5' },
  md: { ring: 'size-12', dot: 'size-2' },
  lg: { ring: 'size-16', dot: 'size-2.5' },
}

const dotPositions = {
  sm: [
    '0 -10px',
    '8.7px -5px',
    '8.7px 5px',
    '0 10px',
    '-8.7px 5px',
    '-8.7px -5px',
  ],
  md: [
    '0 -16px',
    '13.9px -8px',
    '13.9px 8px',
    '0 16px',
    '-13.9px 8px',
    '-13.9px -8px',
  ],
  lg: [
    '0 -22px',
    '19.1px -11px',
    '19.1px 11px',
    '0 22px',
    '-19.1px 11px',
    '-19.1px -11px',
  ],
}

function AnimatedSpinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const s = sizeMap[size]
  const positions = dotPositions[size]

  return (
    <div className={cn('relative', s.ring)}>
      {positions.map((pos, i) => (
        <div
          key={pos}
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(${pos})` }}
        >
          <motion.div
            className={cn('rounded-full bg-primary', s.dot)}
            animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1, 0.7] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        </div>
      ))}
    </div>
  )
}

function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-32 size-64 rounded-full bg-primary/5"
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 20, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 size-96 rounded-full bg-primary/5"
        animate={{
          scale: [1, 1.15, 1],
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3"
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
    </div>
  )
}

export function LoadingPage({
  message,
  variant = 'fullscreen',
  size = 'md',
  className,
}: LoadingPageProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-5"
    >
      <AnimatedSpinner size={size} />

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-sm font-medium text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  )

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex h-screen w-full flex-col items-center justify-center overflow-hidden',
        'rounded-[var(--app-corner-radius)] glass',
        className
      )}
    >
      <div data-tauri-drag-region className="h-10 w-full shrink-0" />
      <DecorativeBackground />
      <div className="flex flex-1 items-center justify-center">{content}</div>
    </div>
  )
}
