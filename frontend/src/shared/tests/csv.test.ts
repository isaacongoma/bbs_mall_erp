import { describe, expect, it } from 'vitest'
import { csvEscape, parseCsv, toCsv } from '../utils/csv'

describe('csv utilities', () => {
  it('escapes values with commas, quotes, and line breaks', () => {
    expect(csvEscape('Jane, "J"')).toBe('"Jane, ""J"""')
    expect(csvEscape('line one\nline two')).toBe('"line one\nline two"')
  })

  it('creates a CSV document from generic records', () => {
    expect(toCsv([{ name: 'EMP-1', note: 'Ready' }], ['name', 'note'])).toBe('name,note\r\nEMP-1,Ready')
  })

  it('parses quoted CSV fields and Windows line endings', () => {
    expect(parseCsv('Name,Note\r\nAlpha,"A, B"\r\nBeta,"He said ""Hi"""')).toEqual([
      ['Name', 'Note'],
      ['Alpha', 'A, B'],
      ['Beta', 'He said "Hi"'],
    ])
  })
})
