import { __ } from '@/core/i18n'
import { createDialog, type DropdownGroupOption, type DropdownOption } from '@/design-system'
import type { LayoutColumn } from '../components/FieldLayout/Column'
import type { LayoutSection } from '../components/FieldLayout/Section'
import type { LayoutTab } from '../components/FieldLayout/FieldLayout'
import { getRandom } from './text'

export type EditorColumn = LayoutColumn
export type EditorSection = LayoutSection & { editable?: boolean }
export type EditorTab = LayoutTab

export type LayoutDraftUpdate = (mutate: (draft: EditorTab[]) => void) => void

export type DragKind = 'tab' | 'section' | 'column' | 'field'

export interface DragItemData {
  role: 'item'
  kind: DragKind
  containerId: string
  itemId: string
}

export interface DragContainerData {
  role: 'container'
  accepts: DragKind[]
  containerId: string
}

export const tabContainerId = (tabName: string) => `tab:${tabName}`
export const sectionContainerId = (sectionName: string) => `section:${sectionName}`
export const columnContainerId = (columnName: string) => `column:${columnName}`

export function newSection(columns: EditorColumn[] = [{ name: `column_${getRandom()}`, fields: [] }]): EditorSection {
  return { label: '', name: `section_${getRandom()}`, opened: true, columns }
}

export function newColumn(): EditorColumn {
  return { label: '', name: `column_${getRandom()}`, fields: [] }
}

export function newTab(label: string): EditorTab {
  return { label, name: `tab_${getRandom()}`, sections: [] }
}

function listOf(draft: EditorTab[], containerId: string): unknown[] | null {
  const [kind, name] = [containerId.slice(0, containerId.indexOf(':')), containerId.slice(containerId.indexOf(':') + 1)]
  for (const tab of draft) {
    if (kind === 'tab' && tab.name === name) return tab.sections
    for (const section of tab.sections) {
      if (kind === 'section' && section.name === name) return section.columns
      for (const column of section.columns) {
        if (kind === 'column' && column.name === name) return column.fields
      }
    }
  }
  return null
}

export function itemKey(kind: DragKind, item: unknown): string {
  const record = item as Record<string, string>
  return kind === 'field' ? record.fieldname! : record.name!
}

export function moveLayoutItem(
  draft: EditorTab[],
  active: DragItemData,
  overContainerId: string,
  overItemId: string | null,
): void {
  const source = listOf(draft, active.containerId)
  const target = listOf(draft, overContainerId)
  if (!source || !target) return

  const from = source.findIndex((item) => itemKey(active.kind, item) === active.itemId)
  if (from < 0) return

  if (overContainerId.startsWith('tab:') && active.kind !== 'section') {
    const tab = draft.find((candidate) => `tab:${candidate.name}` === overContainerId)
    if (!tab || tab.sections.length > 0) return
    const [moved] = source.splice(from, 1)
    if (active.kind === 'column') tab.sections.push(newSection([moved as EditorColumn]))
    else tab.sections.push(newSection([{ name: `column_${getRandom()}`, fields: [moved as never] }]))
    return
  }

  const targetIndex = overItemId ? target.findIndex((item) => itemKey(active.kind, item) === overItemId) : -1

  if (source === target) {
    if (targetIndex < 0 || targetIndex === from) return
    const [moved] = source.splice(from, 1)
    source.splice(targetIndex, 0, moved)
    return
  }

  const [moved] = source.splice(from, 1)
  if (targetIndex < 0) target.push(moved)
  else target.splice(targetIndex, 0, moved)
}

function confirmRemoval(title: string, message: string, onConfirm: () => void) {
  createDialog({
    title,
    message,
    actions: [
      {
        label: __('Remove'),
        variant: 'solid',
        theme: 'red',
        onClick: ({ close }) => {
          onConfirm()
          close()
        },
      },
    ],
  })
}

export interface TabOptionsContext {
  tab: EditorTab
  tabs: EditorTab[]
  tabIndex: number
  update: LayoutDraftUpdate
  setTabIndex: (index: number) => void
  startEditing: (name: string) => void
}

export function getTabOptions({
  tab,
  tabs,
  tabIndex,
  update,
  setTabIndex,
  startEditing,
}: TabOptionsContext): DropdownOption[] {
  return [
    { label: __('Edit'), icon: 'edit', onClick: () => startEditing(tab.name) },
    {
      label: __('Remove Tab'),
      icon: 'trash-2',
      onClick: () => {
        if (tabs.length === 1) {
          update((draft) => {
            draft[0]!.label = ''
          })
          return
        }
        confirmRemoval(__('Remove Tab'), __('Are you sure you want to remove this tab and all its content?'), () => {
          update((draft) => {
            draft.splice(tabIndex, 1)
          })
          setTabIndex(tabIndex ? tabIndex - 1 : 0)
        })
      },
    },
  ]
}

export interface SectionOptionsContext {
  sectionIndex: number
  section: EditorSection
  tab: EditorTab
  tabs: EditorTab[]
  tabIndex: number
  update: LayoutDraftUpdate
  setTabIndex: (index: number) => void
  startEditing: (name: string) => void
}

export function getSectionOptions(context: SectionOptionsContext): DropdownGroupOption[] {
  const { sectionIndex: i, section, tab, tabs, tabIndex, update, setTabIndex, startEditing } = context
  const lastColumn = section.columns[section.columns.length - 1]

  const mutateSection = (mutate: (draftSection: EditorSection, draftTab: EditorTab, draftTabs: EditorTab[]) => void) =>
    update((draft) => {
      const draftTab = draft[tabIndex]!
      const draftSection = draftTab.sections.find((candidate) => candidate.name === section.name)
      if (draftSection) mutate(draftSection as EditorSection, draftTab, draft)
    })

  const removeSection = () =>
    mutateSection((draftSection, draftTab) => {
      draftTab.sections.splice(draftTab.sections.indexOf(draftSection), 1)
    })

  const removeLastColumn = () =>
    mutateSection((draftSection) => {
      draftSection.columns.pop()
    })

  const hasFields = section.columns.some((column) => column.fields.length)

  return [
    {
      group: __('Section'),
      items: [
        { label: __('Edit'), icon: 'edit', onClick: () => startEditing(section.name) },
        {
          label: section.collapsible ? __('Uncollapsible') : __('Collapsible'),
          icon: section.collapsible ? 'chevron-up' : 'chevron-down',
          onClick: () =>
            mutateSection((draftSection) => {
              draftSection.collapsible = !draftSection.collapsible
            }),
        },
        {
          label: section.hideLabel ? __('Show Label') : __('Hide Label'),
          icon: section.hideLabel ? 'eye' : 'eye-off',
          onClick: () =>
            mutateSection((draftSection) => {
              draftSection.hideLabel = !draftSection.hideLabel
            }),
        },
        {
          label: section.hideBorder ? __('Show Border') : __('Hide Border'),
          icon: 'minus',
          onClick: () =>
            mutateSection((draftSection) => {
              draftSection.hideBorder = !draftSection.hideBorder
            }),
        },
        {
          label: __('Remove Section'),
          icon: 'trash-2',
          onClick: () => {
            if (hasFields) {
              confirmRemoval(
                __('Remove Section'),
                __('This section contains fields. Are you sure you want to remove it?'),
                removeSection,
              )
            } else {
              removeSection()
            }
          },
          condition: () => section.editable !== false,
        },
        {
          label: __('Remove and move columns to {0} section', [i === 0 ? __('next') : __('previous')]),
          icon: 'trash-2',
          onClick: () =>
            update((draft) => {
              const draftTab = draft[tabIndex]!
              const target = draftTab.sections[i === 0 ? i + 1 : i - 1]!
              const source = draftTab.sections[i]!
              target.columns = i === 0 ? source.columns.concat(target.columns) : target.columns.concat(source.columns)
              draftTab.sections.splice(i, 1)
            }),
          condition: () => section.editable !== false && section.columns.length > 0,
        },
        {
          label: __('Move to Previous Tab'),
          icon: 'corner-up-left',
          onClick: () => {
            update((draft) => {
              const [moved] = draft[tabIndex]!.sections.splice(i, 1)
              if (moved) draft[tabIndex - 1]!.sections.push(moved)
            })
            setTabIndex(tabIndex - 1)
          },
          condition: () => Boolean(tabs[tabIndex - 1]),
        },
        {
          label: __('Move to Next Tab'),
          icon: 'corner-up-right',
          onClick: () => {
            update((draft) => {
              const [moved] = draft[tabIndex]!.sections.splice(i, 1)
              if (moved) draft[tabIndex + 1]!.sections.push(moved)
            })
            setTabIndex(tabIndex + 1)
          },
          condition: () => Boolean(tabs[tabIndex + 1]),
        },
      ],
    },
    {
      group: __('Column'),
      items: [
        {
          label: __('Add Column'),
          icon: 'columns',
          onClick: () =>
            mutateSection((draftSection) => {
              draftSection.columns.push(newColumn())
            }),
          condition: () => section.columns.length < 4,
        },
        {
          label: __('Remove Last Column'),
          icon: 'trash-2',
          onClick: () => {
            if (lastColumn?.fields.length) {
              confirmRemoval(
                __('Remove Last Column'),
                __('This column contains fields. Are you sure you want to remove it?'),
                removeLastColumn,
              )
            } else {
              removeLastColumn()
            }
          },
          condition: () => section.columns.length > 1,
        },
        {
          label: __('Remove Last Column (move fields to previous)'),
          icon: 'trash-2',
          onClick: () =>
            mutateSection((draftSection) => {
              const previous = draftSection.columns[draftSection.columns.length - 2]!
              const last = draftSection.columns[draftSection.columns.length - 1]!
              previous.fields = previous.fields.concat(last.fields)
              draftSection.columns.pop()
            }),
          condition: () => section.columns.length > 1 && Boolean(lastColumn?.fields.length),
        },
        {
          label: __('Move Last Column to Next Section'),
          icon: 'corner-up-right',
          onClick: () =>
            mutateSection((draftSection, draftTab) => {
              const moved = draftSection.columns.pop()
              if (moved) draftTab.sections[i + 1]!.columns.push(moved)
            }),
          condition: () => Boolean(tab.sections[i + 1]),
        },
        {
          label: __('Move Last Column to Previous Section'),
          icon: 'corner-up-left',
          onClick: () =>
            mutateSection((draftSection, draftTab) => {
              const moved = draftSection.columns.pop()
              if (moved) draftTab.sections[i - 1]!.columns.push(moved)
            }),
          condition: () => Boolean(tab.sections[i - 1]),
        },
        {
          label: __('Move Last Column to Previous Tab'),
          icon: 'corner-up-left',
          onClick: () =>
            mutateSection((draftSection, _draftTab, draftTabs) => {
              const moved = draftSection.columns.pop()
              const target = draftTabs[tabIndex - 1]!
              if (!target.sections.length) target.sections.push(newSection([]))
              if (moved) target.sections[target.sections.length - 1]!.columns.push(moved)
            }),
          condition: () => Boolean(tabs[tabIndex - 1]),
        },
        {
          label: __('Move Last Column to Next Tab'),
          icon: 'corner-up-right',
          onClick: () =>
            mutateSection((draftSection, _draftTab, draftTabs) => {
              const moved = draftSection.columns.pop()
              const target = draftTabs[tabIndex + 1]!
              if (!target.sections.length) target.sections.push(newSection([]))
              if (moved) target.sections[target.sections.length - 1]!.columns.push(moved)
            }),
          condition: () => Boolean(tabs[tabIndex + 1]),
        },
      ],
    },
  ].map((group) => ({ ...group, hideLabel: false })) as DropdownGroupOption[]
}
