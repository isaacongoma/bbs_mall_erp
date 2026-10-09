import type { DocField } from '../types/meta'
import type { LayoutSection, LayoutTab } from '../components/FieldLayout'

export function makeDocumentLayout(fields: DocField[], doctype: string): LayoutTab[] {
  const tabs: LayoutTab[] = []
  let tabIndex = 0
  let sectionIndex = 0
  let columnIndex = 0
  let tab: LayoutTab = { name: `${doctype}-tab-${tabIndex}`, sections: [] }
  let section: LayoutSection = {
    name: `${doctype}-section-${sectionIndex}`,
    columns: [{ name: `${doctype}-column-${columnIndex}`, fields: [] }],
  }

  const pushSection = () => {
    if (section.columns.some((column) => column.fields.length)) tab.sections.push(section)
  }

  const pushTab = () => {
    pushSection()
    if (tab.sections.length) tabs.push(tab)
  }

  fields.forEach((field) => {
    if (field.fieldtype === 'Tab Break') {
      pushTab()
      tabIndex += 1
      sectionIndex = 0
      columnIndex = 0
      tab = { name: `${doctype}-tab-${tabIndex}`, label: field.label, sections: [] }
      section = {
        name: `${doctype}-section-${sectionIndex}`,
        columns: [{ name: `${doctype}-column-${columnIndex}`, fields: [] }],
      }
      return
    }
    if (field.fieldtype === 'Section Break') {
      pushSection()
      sectionIndex += 1
      columnIndex = 0
      section = {
        name: `${doctype}-section-${sectionIndex}`,
        label: field.label,
        columns: [{ name: `${doctype}-column-${columnIndex}`, fields: [] }],
      }
      return
    }
    if (field.fieldtype === 'Column Break') {
      columnIndex += 1
      section.columns.push({ name: `${doctype}-column-${columnIndex}`, fields: [] })
      return
    }
    if (!['Section Break', 'Column Break', 'Tab Break'].includes(field.fieldtype)) {
      section.columns[section.columns.length - 1]?.fields.push(field)
    }
  })

  pushTab()
  return tabs
}
