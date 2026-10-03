import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnyExtension } from '@tiptap/core'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommentKit, Editor, EditorContent, RichTextKit, type EditorHandle, type TiptapEditor } from '../editor'
import { ColorSwatchGrid } from '../editor/components/ColorSwatchGrid'
import { LinkEditorPopup } from '../editor/components/LinkEditorPopup'
import { SuggestionList } from '../editor/components/SuggestionList'
import { TableSizePicker } from '../editor/components/TableSizePicker'
import { UploadProgressIndicator } from '../editor/components/UploadProgressIndicator'
import {
  abortUpload,
  deleteUploadProgress,
  getUploadProgress,
  setUploadProgress,
  updateUploadProgress,
} from '../editor/extensions/shared/media-upload-state'
import type { SuggestionListExpose } from '../editor/extensions/shared/suggestion-types'
import { filterByQuery } from '../editor/extensions/shared/suggestion-helpers'
import { highlightSwatches, textSwatches } from '../editor/utils/swatches'
import { openFloatingPopup } from '../editor/utils/floatingPopup'
import { formatBytes, fileSizeLimitMessage, setMaxFileSize } from '../utils/fileSize'
import { detectMarkdown, markdownToHTML } from '../utils/markdown'
import { configureUpload, isPrivateUpload, uploadFile } from '../utils/upload'

afterEach(() => {
  setMaxFileSize(null)
})

async function mountEditor(extension: AnyExtension = CommentKit, value = '<p>Hello world</p>'): Promise<TiptapEditor> {
  const handle = createRef<EditorHandle>()
  render(
    <Editor ref={handle} extensions={[extension]} value={value}>
      <EditorContent />
    </Editor>,
  )
  await waitFor(() => expect(handle.current?.editor).toBeTruthy())
  return handle.current!.editor as TiptapEditor
}

describe('file helpers', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('reports a size limit message only when the file exceeds the configured limit', () => {
    const file = new File([new Uint8Array(3 * 1024)], 'a.bin')
    expect(fileSizeLimitMessage(file)).toBeNull()
    setMaxFileSize(1024)
    expect(fileSizeLimitMessage(file)).toBe('This file is 3 KB; the limit is 1 KB.')
    expect(fileSizeLimitMessage(null)).toBeNull()
  })

  it('detects and converts markdown', () => {
    expect(detectMarkdown('plain words')).toBe(false)
    expect(detectMarkdown('# Heading')).toBe(true)
    expect(detectMarkdown('see [docs](https://x.io)')).toBe(true)
    expect(markdownToHTML('**bold**')).toContain('<strong>bold</strong>')
  })

  it('normalizes upload privacy flags', () => {
    expect(isPrivateUpload({})).toBe(false)
    expect(isPrivateUpload({ is_private: 1 })).toBe(true)
    expect(isPrivateUpload({ is_private: '1' })).toBe(true)
    expect(isPrivateUpload({ is_private: 0, private: true })).toBe(true)
  })
})

describe('uploadFile', () => {
  it('rejects oversized files before touching the network', async () => {
    setMaxFileSize(10)
    const patches: unknown[] = []
    await expect(
      uploadFile(new File([new Uint8Array(100)], 'big.bin'), {}, (patch) => patches.push(patch)),
    ).rejects.toThrow('the limit is 10 B')
    expect(patches).toHaveLength(1)
  })

  it('posts multipart data with configured headers and resolves the unwrapped message', async () => {
    const sent: Array<{ url: string; headers: Record<string, string>; form: FormData | null }> = []
    class FakeXhr {
      static DONE = 4
      readyState = 0
      status = 0
      responseText = ''
      upload = { addEventListener: vi.fn() }
      headers: Record<string, string> = {}
      url = ''
      onreadystatechange: (() => void) | null = null
      addEventListener = vi.fn()
      open(_method: string, url: string) {
        this.url = url
      }
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value
      }
      send(form: FormData) {
        sent.push({ url: this.url, headers: this.headers, form })
        this.readyState = 4
        this.status = 200
        this.responseText = JSON.stringify({ message: { file_url: '/files/a.png', file_name: 'a.png', file_size: 3 } })
        this.onreadystatechange?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
    configureUpload({ endpoint: '/api/method/upload_file', getHeaders: () => ({ Authorization: 'Bearer t' }) })

    const result = await uploadFile(new File(['abc'], 'a.png'), { doctype: 'CRM Lead', docname: 'L-1', private: true })

    expect(result.file_url).toBe('/files/a.png')
    expect(sent[0]?.url).toBe('/api/method/upload_file')
    expect(sent[0]?.headers.Authorization).toBe('Bearer t')
    expect(sent[0]?.form?.get('is_private')).toBe('1')
    expect(sent[0]?.form?.get('doctype')).toBe('CRM Lead')
    expect(sent[0]?.form?.get('folder')).toBe('Home')
    vi.unstubAllGlobals()
  })

  it('surfaces server error messages', async () => {
    class FailingXhr {
      static DONE = 4
      readyState = 0
      status = 0
      responseText = ''
      upload = { addEventListener: vi.fn() }
      onreadystatechange: (() => void) | null = null
      addEventListener = vi.fn()
      open() {}
      setRequestHeader() {}
      send() {
        this.readyState = 4
        this.status = 417
        this.responseText = JSON.stringify({
          _server_messages: JSON.stringify([JSON.stringify({ message: 'Too large' })]),
        })
        this.onreadystatechange?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', FailingXhr)
    await expect(uploadFile(new File(['abc'], 'a.png'))).rejects.toThrow('Too large')
    vi.unstubAllGlobals()
  })
})

describe('upload progress state', () => {
  it('tracks, aborts and clears per-upload progress', () => {
    const abort = vi.fn()
    setUploadProgress('u1', { loaded: 0, total: 10, percent: 0, abort })
    updateUploadProgress('u1', { loaded: 5, percent: 50 })
    expect(getUploadProgress('u1')).toMatchObject({ loaded: 5, total: 10, percent: 50 })
    abortUpload('u1')
    expect(abort).toHaveBeenCalledOnce()
    deleteUploadProgress('u1')
    expect(getUploadProgress('u1')).toBeUndefined()
  })

  it('renders percent and fires cancel', async () => {
    const onCancel = vi.fn()
    render(<UploadProgressIndicator percent={42} onCancel={onCancel} />)
    expect(screen.getByText('42%')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel upload' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('LinkEditorPopup', () => {
  it('prefixes bare hosts with https and submits', async () => {
    const onUpdateHref = vi.fn()
    render(<LinkEditorPopup href="" onUpdateHref={onUpdateHref} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://example.com')
    await userEvent.type(input, 'github.com')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onUpdateHref).toHaveBeenCalledWith('https://github.com')
  })

  it('rejects dotless hosts and unsafe schemes instead of submitting', async () => {
    const onUpdateHref = vi.fn()
    render(<LinkEditorPopup href="" onUpdateHref={onUpdateHref} onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://example.com')
    await userEvent.type(input, 'asdf')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onUpdateHref).not.toHaveBeenCalled()
    await userEvent.clear(input)
    await userEvent.type(input, 'javascript:alert(1)')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onUpdateHref).not.toHaveBeenCalled()
  })

  it('submits an empty value as a link removal', async () => {
    const onUpdateHref = vi.fn()
    render(<LinkEditorPopup href="https://a.io" startInEdit onUpdateHref={onUpdateHref} onClose={vi.fn()} />)
    await userEvent.clear(screen.getByPlaceholderText('https://example.com'))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onUpdateHref).toHaveBeenCalledWith('')
  })

  it('shows the view mode for existing links and steps back on Escape', async () => {
    const onClose = vi.fn()
    render(<LinkEditorPopup href="https://a.io" startInEdit onUpdateHref={vi.fn()} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.io')
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('TableSizePicker', () => {
  it('grows with arrow keys and confirms with Enter', async () => {
    const onPick = vi.fn()
    render(<TableSizePicker onPick={onPick} />)
    const grid = screen.getByRole('grid')
    await waitFor(() => expect(grid).toHaveFocus())
    expect(grid).toHaveAttribute('aria-label', 'Table size, 3 rows by 3 columns')
    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    expect(grid).toHaveAttribute('aria-label', 'Table size, 4 rows by 4 columns')
    await userEvent.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith({ rows: 4, cols: 4 })
  })

  it('picks by clicking a cell', async () => {
    const onPick = vi.fn()
    render(<TableSizePicker onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: '2 × 5' }))
    expect(onPick).toHaveBeenCalledWith({ rows: 2, cols: 5 })
  })
})

describe('ColorSwatchGrid', () => {
  it('marks the active swatch and reports selections', async () => {
    const onSelect = vi.fn()
    render(<ColorSwatchGrid swatches={textSwatches} active="red" variant="text" onSelect={onSelect} />)
    const pressed = screen.getAllByRole('button').filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    await userEvent.click(screen.getAllByRole('button')[0]!)
    expect(onSelect).toHaveBeenCalledWith(textSwatches[0]?.value)
    expect(highlightSwatches.length).toBeGreaterThan(1)
  })
})

describe('SuggestionList', () => {
  const items = [
    { title: 'Heading 2', group: 'Text' },
    { title: 'Quote', group: 'Text' },
    { title: 'Divider', group: 'Insert' },
  ]

  it('groups items under headers and falls back to the title label', () => {
    render(<SuggestionList items={items} command={vi.fn()} />)
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Insert')).toBeInTheDocument()
    expect(screen.getByText('Divider')).toBeInTheDocument()
  })

  it('navigates with the keyboard through the imperative handle', async () => {
    const command = vi.fn()
    const ref = createRef<SuggestionListExpose>()
    render(<SuggestionList ref={ref} items={items} command={command} />)
    let handled = false
    act(() => {
      handled = ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    })
    expect(handled).toBe(true)
    act(() => {
      ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    })
    expect(command).toHaveBeenCalledWith(items[1])
  })

  it('wraps selection and ignores keys when empty', () => {
    const ref = createRef<SuggestionListExpose>()
    const { rerender } = render(<SuggestionList ref={ref} items={items} command={vi.fn()} />)
    act(() => {
      ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowUp' }) })
    })
    expect(screen.getByRole('button', { name: 'Divider' }).className).toContain('bg-surface-gray-2')
    rerender(<SuggestionList ref={ref} items={[]} command={vi.fn()} showNoResults />)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })).toBe(false)
  })

  it('selects with the mouse', async () => {
    const command = vi.fn()
    render(<SuggestionList items={items} command={command} />)
    await userEvent.click(screen.getByText('Quote'))
    expect(command).toHaveBeenCalledWith(items[1])
  })

  it('filters case-insensitively by substring', () => {
    const filtered = filterByQuery([{ label: 'Alice' }, { label: 'Bob' }, { label: 'ALIcia' }], 'ali', 'label')
    expect(filtered.map((item) => item.label)).toEqual(['Alice', 'ALIcia'])
  })
})

describe('floating popups', () => {
  it('mounts a component next to the anchor and tears it down', async () => {
    const anchor = document.createElement('button')
    document.body.appendChild(anchor)
    function Panel({ label }: { label: string }) {
      return <div role="dialog">{label}</div>
    }
    const handle = openFloatingPopup({ anchor, component: Panel, props: { label: 'hello popup' } })
    expect(document.body.textContent).toContain('hello popup')
    handle.destroy()
    expect(handle.floating).toBeNull()
    await waitFor(() => expect(document.body.textContent).not.toContain('hello popup'))
  })
})

describe('editor extensions', () => {
  it('assigns stable ids to headings for the table of contents', async () => {
    const editor = await mountEditor(RichTextKit, '<h2>Getting started</h2><p>x</p>')
    await waitFor(() => expect(editor.getHTML()).toMatch(/<h2[^>]*>Getting started<\/h2>/))
    expect(editor.schema.nodes.heading).toBeDefined()
  })

  it('opens the slash command list when typing a slash and runs the chosen command', async () => {
    const editor = await mountEditor(RichTextKit, '<p></p>')
    act(() => {
      editor.chain().focus().insertContent('/quote').run()
    })
    const list = await screen.findByRole('dialog', { name: 'Suggestions' })
    expect(list).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Blockquote/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Blockquote/ }))
    await waitFor(() => expect(editor.isActive('blockquote')).toBe(true))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Suggestions' })).toBeNull())
  })

  it('opens the emoji list for a colon trigger and inserts the emoji', async () => {
    const editor = await mountEditor(CommentKit, '<p></p>')
    act(() => {
      editor.chain().focus().insertContent(':smile').run()
    })
    const options = await screen.findAllByRole('button', { name: /smile/i })
    await userEvent.click(options[0]!)
    await waitFor(() => expect(editor.getText()).not.toContain(':smile'))
  })

  it('inserts a table through the size picker command path', async () => {
    const editor = await mountEditor(RichTextKit, '<p></p>')
    act(() => {
      editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()
    })
    expect(editor.getHTML()).toContain('<table')
    expect(editor.can().addColumnAfter()).toBe(true)
  })

  it('stays inert for slash triggers inside code blocks', async () => {
    const editor = await mountEditor(RichTextKit, '<pre><code></code></pre>')
    act(() => {
      editor.chain().focus().insertContent('/quote').run()
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('dialog', { name: 'Suggestions' })).toBeNull()
  })

  it('keeps controlled state in sync across rerenders', async () => {
    function Controlled() {
      const [html, setHtml] = useState('<p>a</p>')
      return (
        <Editor extensions={[CommentKit]} value={html} onChange={(next) => setHtml(next as string)}>
          <EditorContent />
          <output data-testid="out">{html}</output>
        </Editor>
      )
    }
    render(<Controlled />)
    expect(screen.getByTestId('out').textContent).toBe('<p>a</p>')
  })
})
