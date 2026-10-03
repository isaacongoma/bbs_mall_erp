import type { CSSProperties } from 'react'
import { Spinner, type SpinnerProps } from './Spinner'

export interface LoadingIndicatorProps extends Omit<SpinnerProps, 'size' | 'theme'> {
  scale?: number
}

export function LoadingIndicator({ scale = 100, style, ...rest }: LoadingIndicatorProps) {
  const scaled: CSSProperties | undefined = scale === 100 ? undefined : { scale: `${scale}%` }
  return <Spinner style={{ ...scaled, ...style }} {...rest} />
}

export interface LoadingTextProps {
  text?: string
}

export function LoadingText({ text = 'Loading...' }: LoadingTextProps) {
  return (
    <div className="flex items-center text-base text-ink-gray-4">
      <LoadingIndicator className="-ml-1 mr-2 h-3 w-3" /> {text}
    </div>
  )
}
