import '../frappe'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, type DialogSize } from '@/design-system'
import { $ } from '../frappe/runtime'
import { formsVersion, observeElement, subscribeForms, unobserveElement } from '../frappe/formStore'
import { modalVersion, openModals, subscribeModals } from '../frappe/ui/modal'
import { buildFieldContext } from '../frappe/formContext'
import { readLayout } from '../frappe/formAdapter'
import { FieldLayout, type LayoutTab } from './FieldLayout'
import { indicatorTheme } from '../utils/indicatorTheme'

type AnyRecord = Record<string, any>

function useVersion(): number {
  const modals = useSyncExternalStore(subscribeModals, modalVersion, modalVersion)
  const forms = useSyncExternalStore(subscribeForms, formsVersion, formsVersion)
  return modals * 100000 + forms
}

function sizeOf(dialog: AnyRecord): DialogSize {
  if (dialog.size === 'small') return 'md'
  if (dialog.size === 'large') return '3xl'
  if (dialog.size === 'extra-large') return '5xl'
  return 'xl'
}

function buttonState(button: JQuery | undefined) {
  if (!button?.length || button.hasClass('hide') || button.css('display') === 'none') return null
  const label = button.find('.es-button__label').first().text().trim() || button.text().trim()
  if (!label) return null
  return {
    label,
    theme: button.attr('data-theme') === 'red' ? ('red' as const) : undefined,
    disabled: Boolean(button.prop('disabled')),
    loading: button.attr('aria-busy') === 'true',
    onClick: () => button.trigger('click'),
  }
}

function BodyHost({ node }: { node: HTMLElement | undefined }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (!host || !node) return
    if (node.parentElement !== host) host.appendChild(node)
    $(node).find('.form-layout').first().css('display', 'none')
  })
  return <div ref={ref} className="frappe-dialog-body text-sm text-ink-gray-8" />
}

function DialogView({ element }: { element: HTMLElement }) {
  const dialog = $(element).data('frappe-dialog') as AnyRecord | undefined
  const layout = dialog ? readLayout(dialog.layout?.sections ? dialog : { layout: dialog, doctype: dialog.doctype }) : null
  const context = dialog && layout ? buildFieldContext(dialog, layout.overrides) : null

  useEffect(() => {
    observeElement(element)
    return () => unobserveElement(element)
  }, [element])

  if (!dialog) return null

  const data = readValues(dialog)
  const title = $(element).find('.modal-title').first().text().trim() || __('Dialog')
  const indicatorClass = String($(element).find('.indicator').first().attr('class') ?? '')
  const indicator = /(?:^|\s)(green|red|orange|blue|yellow|gray)(?:\s|$)/.exec(indicatorClass)?.[1]
  const primary = buttonState(dialog.get_primary_btn?.())
  const secondary = buttonState(dialog.get_secondary_btn?.())
  const custom = ($(element).find('.custom-actions button').toArray() as HTMLElement[])
    .map((node) => buttonState($(node)))
    .filter(Boolean) as NonNullable<ReturnType<typeof buttonState>>[]
  const leftSecondary = secondary?.label === __('Edit Full Form')
  const leftCustom = custom.filter((action) => action.label === __('Edit Full Form'))
  const rightCustom = custom.filter((action) => action.label !== __('Edit Full Form'))
  const closable = $(element).find('.btn-modal-close').css('display') !== 'none' && !dialog.static
  const bodyHidden = Boolean(dialog.$body?.hasClass?.('hide'))
  const hasFields = Boolean(
    layout?.tabs.some((tab) => tab.sections.some((section) => section.columns.some((column) => column.fields.length))),
  )

  const tabs = (layout?.tabs ?? []).map((tab) => ({
    name: tab.name,
    label: tab.label,
    hidden: tab.hidden,
    sections: tab.sections.map((section) => ({
      name: section.name,
      label: section.label,
      hidden: section.hidden,
      hideBorder: section.hideBorder,
      collapsible: section.collapsible,
      opened: !section.collapsed,
      columns: section.columns.map((column) => ({ name: column.name, label: column.label, fields: column.fields })),
    })),
  })) as unknown as LayoutTab[]

  return (
    <Dialog
      open
      size={sizeOf(dialog)}
      bare
      paddingTop="0px"
      onOpenChange={(open) => {
        if (!open && closable) dialog.hide()
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-outline-gray-2 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {indicator && <span className={`h-2 w-2 shrink-0 rounded-full bg-surface-${indicatorTheme(indicator)}-6`} />}
          <h3 className="truncate text-lg font-medium leading-6 text-ink-gray-9">{title}</h3>
        </div>
        {closable && <Button variant="ghost" className="w-7" icon="lucide-x" onClick={() => dialog.hide()} />}
      </div>
      <div className="bg-surface-elevation-2 px-5 pb-4 pt-5 [&_.sections>.section:last-child]:!border-b-0 [&_.section>div]:!pb-0">
        {hasFields && !bodyHidden && context && (
          <FieldLayout key={String(dialog.title)} tabs={tabs} data={data} doctype="" context={context} />
        )}
        <BodyHost node={dialog.modal_body?.[0]} />
      </div>
      {(primary || secondary || custom.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-gray-2 px-5 py-3.5">
          <div className="flex gap-2">
            {leftCustom.map((action) => (
              <Button key={action.label} label={action.label} onClick={action.onClick} />
            ))}
            {leftSecondary && secondary && (
              <Button label={secondary.label} disabled={secondary.disabled} onClick={secondary.onClick} />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {rightCustom.map((action) => (
              <Button key={action.label} label={action.label} variant="outline" onClick={action.onClick} />
            ))}
            {!leftSecondary && secondary && (
              <Button
                label={secondary.label}
                variant="outline"
                disabled={secondary.disabled}
                onClick={secondary.onClick}
              />
            )}
            {primary && (
              <Button
                label={primary.label}
                variant="solid"
                theme={primary.theme}
                disabled={primary.disabled}
                loading={primary.loading}
                onClick={primary.onClick}
              />
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

function readValues(dialog: AnyRecord): AnyRecord {
  const data: AnyRecord = {}
  for (const control of (dialog.fields_list ?? []) as AnyRecord[]) {
    const name = control?.df?.fieldname
    if (!name || ['Section Break', 'Column Break', 'Tab Break'].includes(control.df.fieldtype)) continue
    data[name] = control.value ?? (typeof control.get_value === 'function' ? control.get_value() : undefined)
  }
  return data
}

export function FrappeDialogHost() {
  useVersion()
  const elements = openModals()
  return (
    <>
      {elements.map((element) => (
        <DialogView key={element.getAttribute('data-modal-key') ?? 'modal'} element={element} />
      ))}
    </>
  )
}
