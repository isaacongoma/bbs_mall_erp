import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { Tabs, cn } from '@/design-system'
import { FieldLayoutContext, useOptionalFieldLayout, type FieldLayoutContextValue } from '../../hooks/useFieldLayout'
import { useDocument } from '../../hooks/useDocument'
import type { DocField, DocRecord } from '../../types/meta'
import '../../styles/fieldLayout.css'
import { Section, type LayoutSection } from './Section'

type AnyRecord = Record<string, any>

export interface LayoutTab {
  name: string
  label?: string
  hidden?: boolean
  sections: LayoutSection[]
  [key: string]: unknown
}

export interface FieldLayoutStandaloneContext {
  fieldPropertyOverrides?: Record<string, Partial<DocField>>
  onFieldChange?: (fieldname: string, value: unknown, row?: AnyRecord | null) => void
  onButton?: (fieldname: string, row?: AnyRecord | null) => Promise<void> | void
  onRowAdd?: (row: AnyRecord) => Promise<void> | void
  onRowRemove?: (selectedRows: Set<string>, rows: AnyRecord[]) => Promise<void> | void
  resolveLinkQuery?: FieldLayoutContextValue['resolveLinkQuery']
  registerHtmlHost?: FieldLayoutContextValue['registerHtmlHost']
  gridUi?: FieldLayoutContextValue['gridUi']
  gridOps?: FieldLayoutContextValue['gridOps']
}

export interface FieldLayoutProps {
  tabs?: LayoutTab[]
  data?: DocRecord
  doctype?: string
  docname?: string
  isGridRow?: boolean
  preview?: boolean
  context?: FieldLayoutStandaloneContext | null
  tabIndex?: number
  onTabIndexChange?: (index: number) => void
  tabName?: string
  onTabNameChange?: (name: string) => void
}

interface BodyProps {
  tabs: LayoutTab[]
  overrides: Record<string, any>
  tabIndex?: number
  onTabIndexChange?: (index: number) => void
  tabName?: string
  onTabNameChange?: (name: string) => void
  baseContext: Omit<FieldLayoutContextValue, 'hasTabs'>
}

function processTabs(tabs: LayoutTab[], overrides: Record<string, any>): LayoutTab[] {
  return tabs
    .map((tab) => {
      const tabOverrides = overrides[tab.name]
      const processedTab = tabOverrides ? { ...tab, ...tabOverrides } : tab
      return {
        ...processedTab,
        sections: processedTab.sections.map((section: LayoutSection) => {
          const sectionOverrides = overrides[section.name]
          return sectionOverrides ? { ...section, ...sectionOverrides } : section
        }),
      } as LayoutTab
    })
    .filter((tab) => !tab.hidden)
}

function FieldLayoutBody({
  tabs,
  overrides,
  tabIndex: controlledIndex,
  onTabIndexChange,
  tabName: controlledName,
  onTabNameChange,
  baseContext,
}: BodyProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [internalName, setInternalName] = useState('')
  const tabIndex = controlledIndex ?? internalIndex
  const tabName = controlledName ?? internalName

  const processedTabs = processTabs(tabs, overrides)
  const hasTabs = processedTabs.length > 1 || (processedTabs.length === 1 && Boolean(processedTabs[0]!.label))

  const namedIndex = tabName ? processedTabs.findIndex((tab) => tab.name === tabName) : -1
  const selectedIndex =
    namedIndex !== -1 ? namedIndex : Math.min(Math.max(tabIndex, 0), Math.max(processedTabs.length - 1, 0))
  const selectedName = processedTabs[selectedIndex]?.name ?? ''

  function updateTab(index: number, name: string) {
    setInternalIndex(index)
    setInternalName(name)
    onTabIndexChange?.(index)
    onTabNameChange?.(name)
  }

  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== selectedIndex) onTabIndexChange?.(selectedIndex)
    if (controlledName !== undefined && controlledName !== selectedName) onTabNameChange?.(selectedName)
  }, [selectedIndex, selectedName, controlledIndex, controlledName, onTabIndexChange, onTabNameChange])

  const context: FieldLayoutContextValue = { ...baseContext, hasTabs }

  return (
    <FieldLayoutContext.Provider value={context}>
      <div
        data-standalone={baseContext.standalone ? '' : undefined}
        className={cn(
          'field-layout flex flex-col',
          baseContext.standalone &&
            "[&_.field_[class*='bg-surface-gray-2']]:!border [&_.field_[class*='bg-surface-gray-2']]:!border-outline-gray-2 [&_.field_[class*='bg-surface-gray-2']]:!bg-surface-base [&_.field_[class*='bg-surface-gray-2']]:!rounded-sm [&_.field_input:not([type=checkbox])]:!border [&_.field_input:not([type=checkbox])]:!border-outline-gray-2 [&_.field_input:not([type=checkbox])]:!bg-surface-base [&_.field_select]:!border [&_.field_select]:!border-outline-gray-2 [&_.field_select]:!bg-surface-base [&_.field_textarea]:!border [&_.field_textarea]:!border-outline-gray-2 [&_.field_textarea]:!bg-surface-base [&_.field_input]:!rounded-sm [&_.field_select]:!rounded-sm [&_.field_textarea]:!rounded-sm",
          hasTabs && !baseContext.standalone && 'rounded-lg border border-outline-elevation-2',
        )}
      >
        <Tabs
          as="div"
          tabs={processedTabs.map((tab) => ({ ...tab, label: tab.label ?? '' }))}
          value={selectedIndex}
          onChange={(index) => updateTab(index, processedTabs[index]?.name || '')}
          className={cn(
            !hasTabs && "[&_[role='tablist']]:hidden",
            baseContext.standalone &&
              "[&_[role='tablist']]:sticky [&_[role='tablist']]:!overflow-visible [&_[role='tablist']>span]:!h-[2px] [&_[role='tablist']]:top-0 [&_[role='tablist']]:z-10 [&_[role='tablist']]:bg-surface-base [&_[role='tablist']]:px-4 [&_[role='tab']]:font-[420] [&_[role='tab'][aria-selected='true']]:font-[480] [&_[role='tab']]:text-ink-gray-5 [&_[role='tab'][aria-selected='true']]:text-ink-gray-9",
            "!overflow-visible [&_[role='tab']]:shrink-0 [&_[role='tab']]:cursor-pointer [&_[role='tablist']::-webkit-scrollbar]:h-0 [&_[role='tabpanel']]:overflow-visible",
          )}
          tabPanel={({ tab }) => (
            <div
              className={cn(
                'sections',
                hasTabs && (baseContext.standalone ? 'mt-1' : 'my-4 sm:my-5'),
                baseContext.standalone &&
                  'm-3 overflow-hidden rounded-sm border border-outline-gray-2 bg-surface-base sm:m-4',
              )}
            >
              {(tab as unknown as LayoutTab).sections.map((section) => (
                <Section key={section.name} section={section} />
              ))}
              {(tab as unknown as { extra?: ReactNode }).extra && (
                <div className="mx-auto w-full max-w-[870px] pt-5">
                  {(tab as unknown as { extra?: ReactNode }).extra}
                </div>
              )}
            </div>
          )}
        />
      </div>
    </FieldLayoutContext.Provider>
  )
}

function noopAsync(): Promise<void> {
  return Promise.resolve()
}

function DocumentFieldLayout(props: FieldLayoutProps) {
  const { tabs = [], data = {}, doctype = 'CRM Lead', docname = '', preview = false } = props
  const resolvedDocname = docname || data.name || ''
  const bundle = useDocument(doctype, resolvedDocname)
  const document = bundle.document as unknown as {
    fieldPropertyOverrides?: Record<string, Partial<DocField>>
    fieldHtmlMap?: Record<string, string>
    setField: (fieldname: string, value: unknown) => void
  }
  const overrides = document.fieldPropertyOverrides ?? {}

  return (
    <FieldLayoutBody
      {...props}
      tabs={tabs}
      overrides={overrides}
      baseContext={{
        data,
        doctype,
        docname: resolvedDocname,
        preview,
        isGridRow: false,
        standalone: false,
        formDocument: document,
        fieldPropertyOverrides: overrides,
        parentDoc: null,
        parentFieldname: '',
        setFieldValue: (fieldname, value) => document.setField(fieldname, value),
        triggerOnChange: bundle.triggerOnChange,
        triggerButton: bundle.triggerButton,
        triggerOnRowAdd: bundle.triggerOnRowAdd,
        triggerOnRowRemove: bundle.triggerOnRowRemove,
      }}
    />
  )
}

function StandaloneFieldLayout(props: FieldLayoutProps & { context: FieldLayoutStandaloneContext }) {
  const { tabs = [], data = {}, doctype = 'CRM Lead', docname = '', preview = false, context } = props
  const [, rerender] = useReducer((count: number) => count + 1, 0)
  const overrides = context.fieldPropertyOverrides ?? {}

  function change(fieldname: string, value: unknown, row?: AnyRecord | null) {
    if (context.onFieldChange) {
      context.onFieldChange(fieldname, value, row)
      return
    }
    if (row) row[fieldname] = value
    else data[fieldname] = value
    rerender()
  }

  return (
    <FieldLayoutBody
      {...props}
      tabs={tabs}
      overrides={overrides}
      baseContext={{
        data,
        doctype,
        docname: docname || data.name || '',
        preview,
        isGridRow: false,
        standalone: true,
        formDocument: context,
        fieldPropertyOverrides: overrides,
        parentDoc: null,
        parentFieldname: '',
        setFieldValue: (fieldname, value) => change(fieldname, value),
        triggerOnChange: async (fieldname, value, row) => change(fieldname, value, row),
        triggerButton: async (fieldname, row) => {
          await context.onButton?.(fieldname, row)
        },
        triggerOnRowAdd: async (row) => {
          await context.onRowAdd?.(row)
        },
        triggerOnRowRemove: async (selected, rows) => {
          await context.onRowRemove?.(selected, rows)
        },
        resolveLinkQuery: context.resolveLinkQuery,
        registerHtmlHost: context.registerHtmlHost,
        gridUi: context.gridUi,
        gridOps: context.gridOps,
      }}
    />
  )
}

function GridRowFieldLayout(props: FieldLayoutProps) {
  const { tabs = [], data = {}, doctype = 'CRM Lead', docname = '', preview = false } = props
  const parent = useOptionalFieldLayout()

  return (
    <FieldLayoutBody
      {...props}
      tabs={tabs}
      overrides={{}}
      baseContext={{
        data,
        doctype,
        docname: docname || data.name || '',
        preview,
        isGridRow: true,
        standalone: false,
        formDocument: parent?.formDocument ?? null,
        fieldPropertyOverrides: parent?.fieldPropertyOverrides ?? {},
        parentDoc: parent?.parentDoc ?? null,
        parentFieldname: parent?.parentFieldname ?? '',
        setFieldValue: parent?.setFieldValue ?? (() => undefined),
        triggerOnChange: parent?.triggerOnChange ?? noopAsync,
        triggerButton: parent?.triggerButton ?? noopAsync,
        triggerOnRowAdd: parent?.triggerOnRowAdd ?? noopAsync,
        triggerOnRowRemove: parent?.triggerOnRowRemove ?? noopAsync,
        resolveLinkQuery: parent?.resolveLinkQuery,
        registerHtmlHost: parent?.registerHtmlHost,
        gridUi: parent?.gridUi,
        gridOps: parent?.gridOps,
      }}
    />
  )
}

export function FieldLayout(props: FieldLayoutProps): ReactNode {
  if (props.context) return <StandaloneFieldLayout {...props} context={props.context} />
  if (props.isGridRow) return <GridRowFieldLayout {...props} />
  return <DocumentFieldLayout {...props} />
}
