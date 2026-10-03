import type { LayoutTab } from '../components/FieldLayout'
import type { DocField } from '../types/meta'

export function mapLayoutFields(tabs: LayoutTab[], transform: (field: DocField) => DocField): LayoutTab[] {
  return tabs.map((tab) => ({
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      columns: section.columns.map((column) => ({ ...column, fields: column.fields.map(transform) })),
    })),
  }))
}

export function mapLayoutSections(
  tabs: LayoutTab[],
  transform: (section: LayoutTab['sections'][number]) => LayoutTab['sections'][number],
): LayoutTab[] {
  return tabs.map((tab) => ({ ...tab, sections: tab.sections.map(transform) }))
}

export function collectLayoutFields(tabs: LayoutTab[]): DocField[] {
  return tabs.flatMap((tab) => tab.sections.flatMap((section) => section.columns.flatMap((column) => column.fields)))
}

export function layoutHasSection(tabs: LayoutTab[] | null, names: string[]): boolean {
  if (!tabs) return false
  return tabs.some((tab) => tab.sections.some((section) => names.includes(section.name)))
}
