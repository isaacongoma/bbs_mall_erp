import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('lets the last colour utility win within the same group', () => {
    expect(cn('bg-surface-gray-2', 'bg-surface-blue-6')).toBe('bg-surface-blue-6')
    expect(cn('text-ink-gray-5', 'text-ink-red-8')).toBe('text-ink-red-8')
  })

  it('keeps a text size and a text colour together', () => {
    expect(cn('text-base', 'text-ink-gray-8')).toBe('text-base text-ink-gray-8')
    expect(cn('text-ink-gray-8', 'text-xs')).toBe('text-ink-gray-8 text-xs')
  })

  it('replaces one text size with another', () => {
    expect(cn('text-base', 'text-lg')).toBe('text-lg')
    expect(cn('text-p-base', 'text-p-sm')).toBe('text-p-sm')
  })

  it('treats weighted text styles as their own group', () => {
    expect(cn('text-base-medium', 'text-ink-gray-9')).toBe('text-base-medium text-ink-gray-9')
    expect(cn('text-base', 'text-base-medium')).toBe('text-base-medium')
    expect(cn('text-base-medium', 'text-xs')).toBe('text-xs')
  })

  it('resolves custom radius tokens', () => {
    expect(cn('rounded-4', 'rounded-md')).toBe('rounded-md')
    expect(cn('rounded-full', 'rounded-5')).toBe('rounded-5')
  })

  it('resolves custom shadow tokens', () => {
    expect(cn('shadow-sm', 'shadow-xl')).toBe('shadow-xl')
  })

  it('keeps independent utilities and drops falsy values', () => {
    const isHidden = false as boolean
    expect(cn('h-7 px-2', isHidden && 'hidden', undefined, 'w-full')).toBe('h-7 px-2 w-full')
  })

  it('merges height and width independently', () => {
    expect(cn('h-7 w-7', 'h-8')).toBe('w-7 h-8')
  })
})
