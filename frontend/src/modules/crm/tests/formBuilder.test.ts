import { describe, expect, it } from 'vitest'
import {
  buildSections,
  flattenSections,
  invalidEmbeddingDomains,
  locateField,
  moveFieldBetweenColumns,
  previewLayout,
  slugify,
  type FormField,
} from '../utils/formBuilder'

function field(fieldname: string, fieldtype = 'Data'): FormField {
  return { fieldname, label: fieldname, fieldtype, reqd: false }
}

describe('form builder layout model', () => {
  const fields = [
    field('s1', 'Section Break'),
    field('a'),
    field('c1', 'Column Break'),
    field('b'),
    field('s2', 'Section Break'),
    field('c'),
  ]

  it('builds sections and columns from a flat field list', () => {
    const sections = buildSections(fields)
    expect(sections).toHaveLength(2)
    expect(sections[0]?.columns).toHaveLength(2)
    expect(sections[0]?.columns[0]?.items.map((item) => item.fieldname)).toEqual(['a'])
    expect(sections[0]?.columns[1]?.items.map((item) => item.fieldname)).toEqual(['b'])
    expect(sections[1]?.columns[0]?.items.map((item) => item.fieldname)).toEqual(['c'])
  })

  it('synthesizes a leading section for loose fields', () => {
    const sections = buildSections([field('a'), field('b')])
    expect(sections).toHaveLength(1)
    expect(sections[0]?.secField.fieldtype).toBe('Section Break')
    expect(sections[0]?.columns[0]?.items).toHaveLength(2)
  })

  it('round-trips through flatten', () => {
    const flat = flattenSections(buildSections(fields)).map((item) => item.fieldname)
    expect(flat).toEqual(['s1', 'a', 'c1', 'b', 's2', 'c'])
  })

  it('creates a column break marker for columns added without one', () => {
    const sections = buildSections([field('s1', 'Section Break'), field('a')])
    sections[0]?.columns.push({ id: 'x', colField: null, items: [field('b')] })
    const flat = flattenSections(sections)
    expect(flat.map((item) => item.fieldtype)).toEqual(['Section Break', 'Data', 'Column Break', 'Data'])
  })

  it('moves a field across columns', () => {
    const sections = buildSections(fields)
    const targetId = sections[1]?.columns[0]?.id ?? ''
    const moved = moveFieldBetweenColumns(sections, 'a', targetId, 0)
    expect(locateField(moved, 'a')).toEqual({ columnId: targetId, index: 0 })
    expect(moved[0]?.columns[0]?.items).toHaveLength(0)
  })

  it('builds the preview layout without empty sections', () => {
    const layout = previewLayout([
      { ...field('s1', 'Section Break'), label: '' },
      { ...field('s2', 'Section Break'), label: '' },
      field('a'),
    ])
    expect(layout).toHaveLength(1)
    expect(layout[0]?.columns[0]?.map((item) => item.fieldname)).toEqual(['a'])
  })
})

describe('form builder helpers', () => {
  it('slugifies titles', () => {
    expect(slugify('  Contact Sales!! ')).toBe('contact-sales')
  })

  it('flags invalid embedding domains', () => {
    expect(invalidEmbeddingDomains('https://ok.example.com\nbad_domain!\n*.good.io')).toEqual(['bad_domain!'])
  })
})
