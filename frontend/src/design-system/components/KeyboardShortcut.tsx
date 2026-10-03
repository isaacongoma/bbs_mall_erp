import { Fragment, type HTMLAttributes, type ReactNode } from 'react'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'
import { detectMac, keyIconMap, parseCombo, wordMap, type Part } from '../utils/keyCombo'

export interface KeyboardShortcutProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  combo?: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  bg?: boolean
  showPlus?: boolean
  altCombos?: string[]
  useIcons?: boolean
  children?: ReactNode
}

export function KeyboardShortcut({
  combo,
  meta,
  ctrl,
  shift,
  alt,
  bg = false,
  showPlus = true,
  altCombos = [],
  useIcons = true,
  className,
  children,
  ...rest
}: KeyboardShortcutProps) {
  const isMac = detectMac()
  const parts = parseCombo(combo, isMac)

  const seen = new Set<string>([parts.map((part) => part.display).join('+')])
  const uniqueAltCombos = altCombos.filter((candidate) => {
    const key = parseCombo(candidate, isMac)
      .map((part) => part.display)
      .join('+')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const ariaLabel = parts.length
    ? `Shortcut ${parts.map((part) => wordMap[part.display] || part.display).join(' + ')}`
    : undefined

  const plainIcon = (part: Part) => {
    if (!useIcons || ['cmd', 'shift', 'alt'].includes(part.type)) return null
    return keyIconMap[part.display] ?? null
  }

  const chipIcon = (part: Part) => (part.type === 'cmd' ? 'command' : (keyIconMap[part.display] ?? null))

  return (
    <>
      <span
        className={cn('inline-flex items-center gap-0.5', !bg && 'text-ink-gray-5 text-sm', className)}
        aria-label={ariaLabel}
        role="note"
        {...rest}
      >
        {bg && parts.length ? (
          parts.map((part, index) => {
            const icon = chipIcon(part)
            return (
              <kbd
                key={`${index}-${part.raw}`}
                className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-surface-gray-2 px-1.5 text-xs-medium text-ink-gray-7"
              >
                {icon ? <LucideIcon name={icon} className="size-3" /> : part.display}
              </kbd>
            )
          })
        ) : parts.length ? (
          parts.map((part, index) => {
            const icon = plainIcon(part)
            return (
              <Fragment key={`${index}-${part.raw}`}>
                <span>
                  {part.type === 'cmd' ? (
                    <LucideIcon name="command" className="size-3" />
                  ) : part.type === 'shift' ? (
                    <LucideIcon name="arrow-big-up" className="size-3" />
                  ) : part.type === 'alt' ? (
                    <LucideIcon name="option" className="size-3" />
                  ) : icon ? (
                    <LucideIcon name={icon} className="size-3" />
                  ) : (
                    <span className="leading-none uppercase">{part.display}</span>
                  )}
                </span>
                {index < parts.length - 1 && showPlus && (
                  <span className="font-mono text-[10px] leading-none opacity-60" aria-hidden="true">
                    +
                  </span>
                )}
              </Fragment>
            )
          })
        ) : (
          <>
            {(ctrl || meta) &&
              (isMac ? (
                <LucideIcon name="command" className="size-3" />
              ) : (
                <span className="font-mono text-[10px] leading-none">Ctrl</span>
              ))}
            {shift && <LucideIcon name="arrow-big-up" className="size-3" />}
            {alt && <LucideIcon name="option" className="size-3" />}
            {children}
          </>
        )}
      </span>
      {uniqueAltCombos.length > 0 && (
        <span className="inline-flex items-center gap-1.5">
          {uniqueAltCombos.map((altCombo, index) => (
            <Fragment key={`alt-${index}-${altCombo}`}>
              <span className="text-xs text-ink-gray-4" aria-hidden="true">
                /
              </span>
              <KeyboardShortcut
                combo={altCombo}
                bg={bg}
                showPlus={showPlus}
                aria-label={`Alternative shortcut ${altCombo}`}
              />
            </Fragment>
          ))}
        </span>
      )}
    </>
  )
}
