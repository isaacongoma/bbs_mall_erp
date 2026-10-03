import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

export interface FadedScrollableDivProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  as?: ElementType
  maskLength?: number
  orientation?: 'vertical' | 'horizontal'
  style?: CSSProperties
  children?: ReactNode
}

function computeMask(el: HTMLElement, side: 'right' | 'bottom', maskLength: number): string {
  const { scrollWidth, clientWidth, scrollHeight, clientHeight, scrollTop, scrollLeft } = el
  let mask = 'none'

  if ((side === 'right' && scrollWidth > clientWidth) || (side === 'bottom' && scrollHeight > clientHeight)) {
    mask = `linear-gradient(to ${side}, transparent, black ${maskLength}px, black calc(100% - ${maskLength}px), transparent)`
  }
  if (
    (side === 'right' && scrollLeft - 20 > clientWidth) ||
    (side === 'bottom' && scrollTop + clientHeight >= scrollHeight)
  ) {
    mask = `linear-gradient(to ${side}, transparent, black ${maskLength}px, black 100%, transparent)`
  }
  if ((side === 'right' && scrollLeft === 0) || (side === 'bottom' && scrollTop === 0)) {
    mask = `linear-gradient(to ${side}, black calc(100% - ${maskLength}px), transparent 100%)`
  }
  if ((side === 'right' && clientWidth === scrollWidth) || (side === 'bottom' && clientHeight === scrollHeight)) {
    mask = 'none'
  }
  return mask
}

export function FadedScrollableDiv({
  as: Tag = 'div',
  maskLength = 30,
  orientation = 'vertical',
  style,
  className,
  children,
  onScroll,
  ...rest
}: FadedScrollableDivProps) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [mask, setMask] = useState('none')
  const side = orientation === 'horizontal' ? 'right' : 'bottom'

  const update = useCallback(() => {
    if (element) setMask(computeMask(element, side, maskLength))
  }, [element, side, maskLength])

  useEffect(() => {
    const timer = setTimeout(update, 300)
    return () => clearTimeout(timer)
  }, [update])

  return (
    <Tag
      ref={setElement}
      style={{ ...style, maskImage: mask, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      {...rest}
      className={`${className ?? ''} [&::-webkit-scrollbar]:hidden`}
      onScroll={(event: React.UIEvent<HTMLElement>) => {
        update()
        onScroll?.(event)
      }}
    >
      {children}
    </Tag>
  )
}
