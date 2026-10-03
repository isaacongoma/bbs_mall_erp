import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnyExtension } from '@tiptap/core'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  CommentKit,
  Editor,
  EditorContent,
  EditorFixedMenu,
  InlineKit,
  RichTextKit,
  commentToolbar,
  type EditorHandle,
  type TiptapEditor,
} from '../editor'
import { createRef } from 'react'

const commentExtensions: AnyExtension[] = [CommentKit]
const richExtensions: AnyExtension[] = [RichTextKit]

function Harness({
  initial = '<p>Hello world</p>',
  onChange,
  extensions = commentExtensions,
  editable = true,
  handle,
}: {
  initial?: string
  onChange?: (value: unknown) => void
  extensions?: AnyExtension[]
  editable?: boolean
  handle?: React.Ref<EditorHandle>
}) {
  const [value, setValue] = useState(initial)
  return (
    <Editor
      ref={handle}
      extensions={extensions}
      value={value}
      editable={editable}
      onChange={(next) => {
        setValue(next as string)
        onChange?.(next)
      }}
      placeholder="Write something"
    >
      <EditorFixedMenu items={commentToolbar} />
      <EditorContent />
    </Editor>
  )
}

async function getEditor(handle: React.RefObject<EditorHandle | null>): Promise<TiptapEditor> {
  await waitFor(() => expect(handle.current?.editor).toBeTruthy())
  return handle.current!.editor as TiptapEditor
}

describe('Editor', () => {
  it('renders initial HTML content inside a prose element', async () => {
    const { container } = render(<Harness />)
    await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull())
    const content = container.querySelector('.ProseMirror') as HTMLElement
    expect(content.textContent).toContain('Hello world')
    expect(content.className).toContain('prose-v3')
  })

  it('drops prose-v3 when a typography size modifier is supplied', async () => {
    function Sized() {
      return (
        <Editor extensions={commentExtensions} value="<p>x</p>">
          <EditorContent className="prose-sm" />
        </Editor>
      )
    }
    const { container } = render(<Sized />)
    await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull())
    const content = container.querySelector('.ProseMirror') as HTMLElement
    expect(content.className).toContain('prose-sm')
    expect(content.className).not.toContain('prose-v3')
  })

  it('emits onChange with serialized HTML after a command', async () => {
    const handle = createRef<EditorHandle>()
    const onChange = vi.fn()
    render(<Harness handle={handle} onChange={onChange} />)
    const editor = await getEditor(handle)
    act(() => {
      editor.chain().focus().selectAll().toggleBold().run()
    })
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(String(onChange.mock.calls.at(-1)?.[0])).toContain('<strong>Hello world</strong>')
  })

  it('applies external value changes without echoing them back', async () => {
    const handle = createRef<EditorHandle>()
    const onChange = vi.fn()
    function Controlled() {
      const [value, setValue] = useState('<p>first</p>')
      return (
        <>
          <button onClick={() => setValue('<p>second</p>')}>swap</button>
          <Editor ref={handle} extensions={commentExtensions} value={value} onChange={onChange}>
            <EditorContent />
          </Editor>
        </>
      )
    }
    render(<Controlled />)
    const editor = await getEditor(handle)
    await userEvent.click(screen.getByText('swap'))
    await waitFor(() => expect(editor.getHTML()).toBe('<p>second</p>'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reports emptiness and applies the placeholder', async () => {
    const handle = createRef<EditorHandle>()
    render(
      <Editor ref={handle} extensions={commentExtensions} value="" placeholder="Write something">
        <EditorContent />
      </Editor>,
    )
    await getEditor(handle)
    await waitFor(() => expect(handle.current?.isEmpty).toBe(true))
    await waitFor(() => expect(document.querySelector('[data-placeholder="Write something"]')).not.toBeNull())
  })

  it('toggles editability', async () => {
    const handle = createRef<EditorHandle>()
    const { rerender } = render(<Harness handle={handle} editable />)
    const editor = await getEditor(handle)
    expect(editor.isEditable).toBe(true)
    rerender(<Harness handle={handle} editable={false} />)
    await waitFor(() => expect(editor.isEditable).toBe(false))
  })
})

describe('toolbar', () => {
  it('shows only the items whose extensions are loaded and reflects active state', async () => {
    const handle = createRef<EditorHandle>()
    render(<Harness handle={handle} />)
    const editor = await getEditor(handle)
    const bold = await screen.findByRole('button', { name: 'Bold' })
    expect(bold).toHaveAttribute('aria-pressed', 'false')
    act(() => {
      editor.chain().focus().selectAll().toggleBold().run()
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Strike' })).toBeInTheDocument()
  })

  it('runs an item action on click', async () => {
    const handle = createRef<EditorHandle>()
    render(<Harness handle={handle} />)
    const editor = await getEditor(handle)
    act(() => {
      editor.commands.selectAll()
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Italic' }))
    await waitFor(() => expect(editor.getHTML()).toContain('<em>'))
  })

  it('prunes items whose extensions are absent', async () => {
    const handle = createRef<EditorHandle>()
    render(<Harness handle={handle} extensions={[InlineKit]} />)
    await getEditor(handle)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Bullet List' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })
})

describe('kits', () => {
  it('RichTextKit registers table, task list and slash commands', async () => {
    const handle = createRef<EditorHandle>()
    render(<Harness handle={handle} extensions={richExtensions} />)
    const editor = await getEditor(handle)
    const names = editor.extensionManager.extensions.map((extension) => extension.name)
    for (const expected of ['table', 'taskList', 'slashCommands', 'codeBlock', 'image', 'iframe', 'tocNode']) {
      expect(names).toContain(expected)
    }
  })

  it('CommentKit leaves tables off by default', async () => {
    const handle = createRef<EditorHandle>()
    render(<Harness handle={handle} />)
    const editor = await getEditor(handle)
    expect(editor.schema.nodes.table).toBeUndefined()
    expect(editor.schema.nodes.image).toBeDefined()
  })

  it('InlineKit allows a single block only', async () => {
    const handle = createRef<EditorHandle>()
    render(<Harness handle={handle} extensions={[InlineKit]} initial="<p>one</p>" />)
    const editor = await getEditor(handle)
    act(() => {
      editor.chain().focus().setTextSelection(4).splitBlock().run()
    })
    expect(editor.state.doc.childCount).toBe(1)
  })
})
