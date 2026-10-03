import { describe, expect, it } from 'vitest'
import { collapseReplies } from '../utils/emailContent'

describe('collapseReplies', () => {
  it('returns untouched html when there is no quoted reply', () => {
    expect(collapseReplies('<p>Hello</p>')).toBe('<p>Hello</p>')
  })

  it('wraps a gmail quote in a collapsible block', () => {
    const html = collapseReplies('<div>New</div><br><div class="gmail_quote">Old</div>')
    expect(html).toContain('replied-content')
    expect(html).toContain('replyCollapser')
    expect(html).not.toContain('gmail_quote')
    expect(html).toContain('Old')
  })

  it('collapses everything after an outlook marker', () => {
    const html = collapseReplies('<div>Hi</div><div id="appendonsend"></div><p>one</p><p>two</p>')
    expect(html).toContain('replied-content')
    expect(html).toContain('one')
    expect(html.indexOf('replied-content')).toBeGreaterThan(html.indexOf('Hi'))
  })

  it('collapses reply-to-content paragraphs', () => {
    const html = collapseReplies('<p>Reply</p><p class="reply-to-content">quoted</p><p>tail</p>')
    expect(html).toContain('replied-content')
    expect(html).toContain('tail')
  })
})
