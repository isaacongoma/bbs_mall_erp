import * as RadixDialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon, LucideIcon, isLucideIconString } from '../../icons'
import { cn } from '../../utils/cn'
import { Button, type ButtonProps } from '../Button'
import '../../styles/dialog.css'

export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
export type DialogTheme = 'yellow' | 'blue' | 'red' | 'green'
export type DialogPosition = 'center' | 'top'
export type DialogIconAppearance = 'warning' | 'info' | 'danger' | 'success'

export interface DialogIconSpec {
  name: string
  theme?: DialogTheme
  appearance?: DialogIconAppearance
}

export interface DialogActionContext {
  close: () => void
}

export interface DialogAction extends Omit<ButtonProps, 'onClick'> {
  label: string
  onClick?: (context: DialogActionContext) => void | Promise<void>
}

export interface DialogOptions {
  title?: string
  message?: string
  size?: DialogSize
  icon?: string | DialogIconSpec
  actions?: DialogAction[]
  position?: DialogPosition
  paddingTop?: string | number
}

type Slot = ReactNode | ((context: DialogActionContext) => ReactNode)

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onAfterLeave?: () => void
  title?: string
  message?: string
  icon?: string | DialogIconSpec
  size?: DialogSize
  position?: DialogPosition
  paddingTop?: string | number
  actions?: DialogAction[]
  dismissible?: boolean
  disableOutsideClickToClose?: boolean
  showCloseButton?: boolean
  bare?: boolean
  options?: DialogOptions
  titleContent?: Slot
  actionsContent?: (context: DialogActionContext & { actions: ResolvedAction[] }) => ReactNode
  children?: Slot
  body?: Slot
  bodyMain?: Slot
  bodyHeader?: Slot
  bodyTitle?: Slot
  bodyContent?: Slot
}

export type ResolvedAction = Omit<DialogAction, 'onClick'> & {
  loading: boolean
  onClick: () => void | Promise<void>
}

const sizeClasses: Record<string, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
}

const appearanceToTheme: Record<DialogIconAppearance, DialogTheme> = {
  warning: 'yellow',
  info: 'blue',
  danger: 'red',
  success: 'green',
}

const iconBackgrounds: Record<DialogTheme, string> = {
  yellow: 'bg-surface-amber-2',
  blue: 'bg-surface-blue-2',
  red: 'bg-surface-red-2',
  green: 'bg-surface-green-2',
}

const iconColors: Record<DialogTheme, string> = {
  yellow: 'text-ink-amber-6',
  blue: 'text-ink-blue-6',
  red: 'text-ink-red-8',
  green: 'text-ink-green-6',
}

const AUTOFOCUS_SELECTOR = '[autofocus], [data-autofocus]'

const FOCUSABLE_SELECTOR = [
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  '[contenteditable=""]',
].join(',')

function focusMarked(root: HTMLElement | null) {
  const marker = root?.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR)
  if (!marker) return
  const target = marker.matches(FOCUSABLE_SELECTOR) ? marker : marker.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  if (!target) return
  target.focus()
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    try {
      target.select()
    } catch {
      return
    }
  }
}

function resolveSlot(slot: Slot | undefined, context: DialogActionContext): ReactNode {
  return typeof slot === 'function' ? slot(context) : slot
}

function CloseButton({ className }: { className?: string }) {
  return (
    <RadixDialog.Close asChild>
      <Button
        variant="ghost"
        label="Close"
        className={className}
        iconSlot={<LucideIcon name="x" className="size-4 text-ink-gray-9" />}
      />
    </RadixDialog.Close>
  )
}

export function Dialog(props: DialogProps) {
  const { options, dismissible = true, showCloseButton = true, bare = false } = props
  const title = props.title ?? options?.title
  const message = props.message ?? options?.message
  const iconSpec = props.icon ?? options?.icon
  const size = props.size ?? options?.size ?? 'lg'
  const position = props.position ?? options?.position ?? 'center'
  const paddingTop = props.paddingTop ?? options?.paddingTop
  const actionList = props.actions ?? options?.actions ?? []

  const [uncontrolledOpen, setUncontrolledOpen] = useState(props.open ?? false)
  const open = props.open ?? uncontrolledOpen
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [loadingActions, setLoadingActions] = useState<Record<number, boolean>>({})
  const afterLeaveRef = useRef(props.onAfterLeave)

  useEffect(() => {
    afterLeaveRef.current = props.onAfterLeave
  })

  const setOpen = (next: boolean) => {
    if (props.open === undefined) setUncontrolledOpen(next)
    props.onOpenChange?.(next)
    if (!next) props.onClose?.()
  }

  const close = () => setOpen(false)
  const context: DialogActionContext = { close }

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => focusMarked(contentRef.current))
    return () => cancelAnimationFrame(frame)
  }, [open])

  const icon = typeof iconSpec === 'string' ? ({ name: iconSpec } as DialogIconSpec) : iconSpec
  const iconTheme: DialogTheme | null = icon?.theme ?? (icon?.appearance ? appearanceToTheme[icon.appearance] : null)

  const actions: ResolvedAction[] = bare
    ? []
    : (actionList.map((action, index) => ({
        ...action,
        loading: Boolean(loadingActions[index]) || Boolean(action.loading),
        onClick: !action.onClick
          ? close
          : async () => {
              setLoadingActions((current) => ({ ...current, [index]: true }))
              try {
                await action.onClick?.(context)
              } finally {
                setLoadingActions((current) => ({ ...current, [index]: false }))
              }
            },
      })) as unknown as ResolvedAction[])

  const hasTitleSlot = props.titleContent !== undefined || props.bodyTitle !== undefined
  const showHeader = !bare && (hasTitleSlot || Boolean(title))
  const singleActionFullWidth = actions.length === 1 && ['xs', 'sm', 'md'].includes(size)

  const positionClasses = paddingTop ? '' : position === 'top' ? 'pt-[20vh]' : 'justify-center'
  const positionStyle: CSSProperties = paddingTop ? { paddingTop } : {}

  const renderBody = (): ReactNode => {
    if (bare) return resolveSlot(props.children, context)
    if (props.body !== undefined) return resolveSlot(props.body, context)

    const defaultContent =
      props.bodyContent !== undefined
        ? resolveSlot(props.bodyContent, context)
        : props.children !== undefined
          ? resolveSlot(props.children, context)
          : message && (
              <RadixDialog.Description asChild>
                <p className="text-p-base text-ink-gray-7">{message}</p>
              </RadixDialog.Description>
            )

    return (
      <>
        {props.bodyMain !== undefined ? (
          resolveSlot(props.bodyMain, context)
        ) : (
          <div className="bg-surface-elevation-1 px-4 pb-6 pt-5 sm:px-6">
            <div className="flex">
              <div className="w-full flex-1">
                {props.bodyHeader !== undefined
                  ? resolveSlot(props.bodyHeader, context)
                  : showHeader && (
                      <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          {icon && (
                            <div
                              className={cn(
                                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                                iconTheme ? iconBackgrounds[iconTheme] : 'bg-surface-gray-2',
                              )}
                            >
                              <Icon
                                source={icon.name}
                                className={cn(
                                  isLucideIconString(icon.name) ? 'size-4' : 'h-4 w-4',
                                  iconTheme ? iconColors[iconTheme] : 'text-ink-gray-5',
                                )}
                                hidden
                              />
                            </div>
                          )}
                          <RadixDialog.Title asChild>
                            <header className="flex-1">
                              {props.titleContent !== undefined
                                ? resolveSlot(props.titleContent, context)
                                : props.bodyTitle !== undefined
                                  ? resolveSlot(props.bodyTitle, context)
                                  : title && <h3 className="text-2xl-semibold leading-6 text-ink-gray-8">{title}</h3>}
                            </header>
                          </RadixDialog.Title>
                        </div>
                        {showCloseButton && <CloseButton />}
                      </div>
                    )}
                {defaultContent}
              </div>
            </div>
          </div>
        )}

        {(actions.length > 0 || props.actionsContent) && (
          <div className="px-4 pb-7 pt-4 sm:px-6">
            {props.actionsContent ? (
              props.actionsContent({ close, actions })
            ) : (
              <div className={singleActionFullWidth ? '' : 'flex justify-end gap-2'}>
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    {...action}
                    className={cn(singleActionFullWidth && 'w-full', action.className)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  const hidesCloseButton =
    showHeader || bare || props.body !== undefined || props.bodyHeader !== undefined || !showCloseButton

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 bg-black-overlay-200 dark:bg-black-overlay-700 dialog-overlay outline-none z-50"
          data-dialog={title}
        />
        <div
          className={cn('fixed inset-0 overflow-y-auto dialog-scroll-container z-50', !open && 'pointer-events-none')}
        >
          <div
            className={cn('flex min-h-screen flex-col items-center px-4 py-4 text-center', positionClasses)}
            style={positionStyle}
            data-position={position}
          >
            <RadixDialog.Content
              ref={contentRef}
              aria-describedby={undefined}
              className={cn(
                'relative my-8 inline-block w-full transform overflow-hidden rounded-xl bg-surface-elevation-1 text-start align-middle shadow-xl dialog-content focus-visible:outline-none',
                sizeClasses[size] ?? 'max-w-lg',
              )}
              onOpenAutoFocus={(event) => {
                if (contentRef.current?.querySelector(AUTOFOCUS_SELECTOR)) event.preventDefault()
              }}
              onEscapeKeyDown={(event) => {
                if (!dismissible) event.preventDefault()
              }}
              onInteractOutside={(event) => {
                if (!dismissible || props.disableOutsideClickToClose) event.preventDefault()
              }}
              onAnimationEnd={() => {
                if (!open) afterLeaveRef.current?.()
              }}
            >
              {!showHeader && !props.bodyTitle && !props.titleContent && (
                <RadixDialog.Title className="sr-only">{title ?? 'Dialog'}</RadixDialog.Title>
              )}
              {renderBody()}
              {!hidesCloseButton && <CloseButton className="absolute right-4 top-4 z-10" />}
            </RadixDialog.Content>
          </div>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
