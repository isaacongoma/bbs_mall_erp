import type { CSSProperties } from 'react'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'
import '../styles/circularProgress.css'

export type CircularProgressSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type CircularProgressTheme = 'black' | 'red' | 'green' | 'blue' | 'orange'

export interface CircularProgressBarProps {
  step?: number
  totalSteps?: number
  showPercentage?: boolean
  variant?: 'solid' | 'outline'
  theme?: CircularProgressTheme | { primary: string; secondary: string }
  size?: CircularProgressSize
  themeComplete?: string
  className?: string
}

interface SizeSpec {
  ringSize: string
  ringBarWidth: string
  text: string
  percentText: string
  checkIconSize: string
}

const SIZES: Record<CircularProgressSize, SizeSpec> = {
  xs: { ringSize: '30px', ringBarWidth: '6px', text: '12px', percentText: '8px', checkIconSize: '16px' },
  sm: { ringSize: '42px', ringBarWidth: '10px', text: '16px', percentText: '12px', checkIconSize: '20px' },
  md: { ringSize: '60px', ringBarWidth: '14px', text: '20px', percentText: '16px', checkIconSize: '24px' },
  lg: { ringSize: '84px', ringBarWidth: '18px', text: '24px', percentText: '20px', checkIconSize: '40px' },
  xl: { ringSize: '108px', ringBarWidth: '22px', text: '28px', percentText: '24px', checkIconSize: '48px' },
}

const THEMES: Record<CircularProgressTheme, { primary: string; secondary: string }> = {
  black: { primary: '#333', secondary: '#888' },
  red: { primary: '#FF0000', secondary: '#FFD7D7' },
  green: { primary: '#22C55E', secondary: '#b1ffda' },
  blue: { primary: '#2376f5', secondary: '#D7D7FF' },
  orange: { primary: '#FFA500', secondary: '#FFE5CC' },
}

export function CircularProgressBar({
  step = 1,
  totalSteps = 4,
  showPercentage = false,
  variant = 'solid',
  theme = 'black',
  size = 'md',
  themeComplete = 'lightgreen',
  className,
}: CircularProgressBarProps) {
  const spec = SIZES[size] ?? SIZES.md
  const colors = typeof theme === 'string' ? (THEMES[theme] ?? THEMES.black) : theme
  const progress = (step / totalSteps) * 100
  const completed = step === totalSteps

  const style = {
    '--size': spec.ringSize,
    '--bar-width': spec.ringBarWidth,
    '--font-size': showPercentage ? spec.percentText : spec.text,
    '--check-icon-size': spec.checkIconSize,
    '--color-progress': colors.primary,
    '--color-remaining-circle': colors.secondary,
    '--color-complete': themeComplete,
    '--progress': `${progress}%`,
  } as CSSProperties

  return (
    <div
      className={cn('progressbar', completed && 'completed', variant === 'outline' && 'fillOuter', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={totalSteps}
      aria-valuenow={step}
      style={style}
    >
      {completed ? (
        <LucideIcon name="lucide-check" className="check-icon" />
      ) : (
        <div>
          <p>{showPercentage ? `${progress.toFixed(0)}%` : step}</p>
        </div>
      )}
    </div>
  )
}
