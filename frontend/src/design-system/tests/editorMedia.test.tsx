import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Editor, EditorContent, RichTextKit, type EditorHandle, type TiptapEditor } from '../editor'
import { IframeInsertDialog } from '../editor/components/IframeInsertDialog'
import { ImageViewerModal } from '../editor/components/ImageViewerModal'
import { VideoControls } from '../editor/components/VideoControls'
import { openImageViewerModal } from '../editor/extensions/image-viewer/imageViewerController'
import { collectViewableImages, indexOfSrc } from '../editor/extensions/image-viewer/collectImages'
import { clampColumns, fileItemId, isImageSupported } from '../editor/extensions/image-group/image-group-utils'
import { useZoomPan } from '../editor/hooks/useZoomPan'
import { useImageNavigation } from '../editor/hooks/useImageNavigation'
import { createImageViewerKeydown } from '../editor/utils/imageViewerKeymap'
import { renderHook } from '@testing-library/react'

class FakeImage {
  naturalWidth = 400
  naturalHeight = 200
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
  removeAttribute() {}
}

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function mountEditor(
  value = '<p></p>',
  uploadFunction?: (file: File) => Promise<{ file_url: string; file_name?: string }>,
): Promise<TiptapEditor> {
  const handle = createRef<EditorHandle>()
  render(
    <Editor ref={handle} extensions={[RichTextKit]} value={value} uploadFunction={uploadFunction}>
      <EditorContent />
    </Editor>,
  )
  await waitFor(() => expect(handle.current?.editor).toBeTruthy())
  return handle.current!.editor as TiptapEditor
}

describe('image node view', () => {
  it('renders an inserted image with its toolbar once selected', async () => {
    const editor = await mountEditor()
    act(() => {
      editor.chain().focus().setImage({ src: 'https://cdn.test/a.png', alt: 'Logo', width: 200, height: 100 }).run()
    })
    const image = await screen.findByAltText('Logo')
    expect(image).toHaveAttribute('src', 'https://cdn.test/a.png')
    act(() => {
      editor.commands.setNodeSelection(editor.state.doc.content.firstChild!.nodeSize > 0 ? 1 : 0)
    })
    expect(await screen.findByRole('button', { name: 'Align left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace image' })).toBeInTheDocument()
  })

  it('updates alignment through the toolbar', async () => {
    const editor = await mountEditor()
    act(() => {
      editor.chain().focus().setImage({ src: 'https://cdn.test/a.png' }).run()
    })
    await waitFor(() => expect(document.querySelector('img')).not.toBeNull())
    act(() => {
      editor.commands.setNodeSelection(1)
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Align right' }))
    await waitFor(() => expect(editor.getHTML()).toContain('data-align="right"'))
  })

  it('shows a caption field and stores it as alt text', async () => {
    const editor = await mountEditor()
    act(() => {
      editor.chain().focus().setImage({ src: 'https://cdn.test/a.png' }).run()
    })
    await waitFor(() => expect(document.querySelector('img')).not.toBeNull())
    act(() => {
      editor.commands.setNodeSelection(1)
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Toggle caption' }))
    const caption = await screen.findByLabelText('Media caption')
    await userEvent.type(caption, 'Our logo')
    await userEvent.tab()
    await waitFor(() => expect(editor.getHTML()).toContain('alt="Our logo"'))
  })

  it('uploads a file, shows the staged preview, then swaps in the uploaded url', async () => {
    let finish: (value: { file_url: string }) => void = () => undefined
    const upload = vi.fn(
      () =>
        new Promise<{ file_url: string }>((resolve) => {
          finish = resolve
        }),
    )
    const editor = await mountEditor('<p></p>', upload)
    act(() => {
      editor.commands.uploadImage(new File(['abc'], 'photo.png', { type: 'image/png' }))
    })
    await waitFor(() => expect(upload).toHaveBeenCalled())
    await waitFor(() => expect(editor.getHTML()).toContain('<img'))
    await act(async () => {
      finish({ file_url: '/files/photo.png' })
    })
    await waitFor(() => expect(editor.getHTML()).toContain('/files/photo.png'))
    await waitFor(() => expect(document.querySelector('.not-prose img')).toHaveAttribute('src', '/files/photo.png'))
  })

  it('keeps a failed upload visible with retry controls', async () => {
    const upload = vi.fn().mockRejectedValue(new Error('Disk full'))
    const editor = await mountEditor('<p></p>', upload)
    act(() => {
      editor.commands.uploadImage(new File(['abc'], 'photo.png', { type: 'image/png' }))
    })
    expect(await screen.findByText('Disk full')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })
})

describe('image viewer', () => {
  const images = [
    { src: '/a.png', alt: 'First' },
    { src: '/b.png', alt: 'Second' },
    { src: '/c.png', alt: null },
  ]

  it('collects only loaded, error-free images from the document', async () => {
    const editor = await mountEditor('<p><img src="/a.png" alt="A"><img src="/b.png"></p>')
    const collected = collectViewableImages(editor.state.doc)
    expect(collected.map((image) => image.src)).toEqual(['/a.png', '/b.png'])
    expect(indexOfSrc(collected, '/b.png')).toBe(1)
    expect(indexOfSrc(collected, '/missing.png')).toBe(0)
  })

  it('zooms with the keyboard, navigates and closes on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<ImageViewerModal open onOpenChange={onOpenChange} images={images} initialIndex={0} />)
    expect(await screen.findByAltText('First')).toBeInTheDocument()
    expect(screen.getByText('1/3')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowRight}')
    expect(await screen.findByAltText('Second')).toBeInTheDocument()
    await userEvent.keyboard('+')
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('125%')
    await userEvent.keyboard('-')
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('100%')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(await screen.findByAltText('Image preview')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('wraps navigation and resets zoom through the controls', async () => {
    render(<ImageViewerModal open onOpenChange={vi.fn()} images={images} initialIndex={2} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(await screen.findByAltText('First')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('150%')
    await userEvent.click(screen.getByRole('button', { name: 'Reset zoom' }))
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('100%')
  })

  it('opens imperatively and mounts above the page', async () => {
    openImageViewerModal(images, 1)
    expect(await screen.findByAltText('Second')).toBeInTheDocument()
  })

  it('maps keys to viewer actions only while open', () => {
    const actions = {
      isOpen: vi.fn(() => true),
      isPanning: vi.fn(() => false),
      onActivity: vi.fn(),
      next: vi.fn(),
      previous: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      toggleFullscreen: vi.fn(),
      close: vi.fn(),
    }
    const handler = createImageViewerKeydown(actions)
    handler(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    handler(new KeyboardEvent('keydown', { key: 'f' }))
    expect(actions.next).toHaveBeenCalledOnce()
    expect(actions.toggleFullscreen).toHaveBeenCalledOnce()
    actions.isPanning.mockReturnValue(true)
    handler(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(actions.previous).not.toHaveBeenCalled()
    actions.isOpen.mockReturnValue(false)
    handler(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(actions.close).not.toHaveBeenCalled()
  })
})

describe('zoom and navigation hooks', () => {
  it('clamps zoom steps and snaps out of zoomed-in state', () => {
    const { result } = renderHook(() => useZoomPan(null, true))
    act(() => result.current.zoomIn())
    act(() => result.current.zoomIn())
    expect(result.current.zoomLevel).toBe(150)
    act(() => result.current.setPanPosition({ x: 5, y: 5 }))
    act(() => result.current.zoomOut())
    act(() => result.current.zoomOut())
    expect(result.current.zoomLevel).toBe(100)
    expect(result.current.panPosition).toEqual({ x: 0, y: 0 })
    act(() => result.current.setZoomLevel(300))
    act(() => result.current.zoomIn())
    expect(result.current.zoomLevel).toBe(300)
  })

  it('wraps image navigation both ways and notifies', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useImageNavigation({ initialIndex: 0, imageCount: 3, onNavigate }))
    act(() => result.current.previousImage())
    expect(result.current.currentIndex).toBe(2)
    act(() => result.current.nextImage())
    expect(result.current.currentIndex).toBe(0)
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })
})

describe('image group', () => {
  it('renders a gallery node with a column control when selected', async () => {
    const editor = await mountEditor()
    act(() => {
      editor
        .chain()
        .focus()
        .setImageGroup({
          images: [
            { src: '/1.png', alt: 'One' },
            { src: '/2.png', alt: 'Two' },
            { src: '/3.png', alt: '' },
          ],
          columns: 3,
        })
        .run()
    })
    await waitFor(() => expect(document.querySelectorAll('.aspect-square img')).toHaveLength(3))
    expect(screen.getAllByAltText('One').length).toBeGreaterThan(0)
    act(() => {
      editor.commands.setNodeSelection(0)
    })
    const twoColumns = await screen.findByRole('button', { name: '2 columns' })
    await userEvent.click(twoColumns)
    await waitFor(() => expect(editor.getHTML()).toContain('data-columns="2"'))
  })

  it('validates group helpers', () => {
    expect(clampColumns(7)).toBe(4)
    expect(clampColumns('3')).toBe(3)
    expect(isImageSupported(new File([''], 'a.heic', { type: 'image/heic' }))).toBe(false)
    expect(isImageSupported(new File([''], 'a.png', { type: 'image/png' }))).toBe(true)
    const file = new File(['x'], 'a.png', { type: 'image/png', lastModified: 5 })
    expect(fileItemId(file)).toBe(fileItemId(new File(['x'], 'a.png', { type: 'image/png', lastModified: 5 })))
  })
})

describe('iframe embeds', () => {
  it('renders a sandboxed iframe for an inserted embed', async () => {
    const editor = await mountEditor()
    act(() => {
      editor.chain().focus().setIframe({ src: 'https://www.youtube.com/embed/abc123', width: 640, height: 360 }).run()
    })
    const frame = await waitFor(() => {
      const found = document.querySelector('iframe')
      expect(found).not.toBeNull()
      return found as HTMLIFrameElement
    })
    expect(frame.getAttribute('src')).toContain('youtube.com/embed/abc123')
    expect(frame.getAttribute('sandbox')).toBeTruthy()
  })

  it('validates the dialog input and inserts a valid embed', async () => {
    const editor = await mountEditor()
    const onOpenChange = vi.fn()
    render(<IframeInsertDialog open onOpenChange={onOpenChange} editor={editor} />)
    const textarea = await screen.findByPlaceholderText(/youtube.com/)
    const insert = screen.getByRole('button', { name: 'Insert Embed' })
    expect(insert).toBeDisabled()
    await userEvent.type(textarea, 'not a url')
    expect(await screen.findByText(/supported URL/)).toBeInTheDocument()
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'https://www.youtube.com/watch?v=abc123')
    expect(await screen.findByText(/Valid YouTube URL/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Insert Embed' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(editor.getHTML()).toContain('iframe'))
  })
})

describe('table of contents and attachments', () => {
  it('lists headings in a table of contents node', async () => {
    const editor = await mountEditor('<h2>Overview</h2><p>text</p><h3>Details</h3>')
    act(() => {
      editor.chain().focus('end').insertTableOfContentsNode().run()
    })
    const toc = await waitFor(() => {
      const found = document.querySelector('.table-of-contents-node')
      expect(found).not.toBeNull()
      return found as HTMLElement
    })
    await waitFor(() => expect(toc.textContent).toContain('Overview'))
    expect(toc.textContent).toContain('Details')
  })

  it('shows the empty state when a document has no headings', async () => {
    const editor = await mountEditor('<p>no headings</p>')
    act(() => {
      editor.chain().focus('end').insertTableOfContentsNode().run()
    })
    expect(await screen.findByText('There are no headings in this document.')).toBeInTheDocument()
  })

  it('renders an attachment chip as a download link', async () => {
    const editor = await mountEditor()
    act(() => {
      editor.chain().focus().setAttachment({ src: '/files/report.pdf', fileName: 'report.pdf', fileSize: 2048 }).run()
    })
    const link = await screen.findByRole('link', { name: /report\.pdf/ })
    expect(link).toHaveAttribute('href', '/files/report.pdf')
    expect(link).toHaveTextContent('2 KB')
  })
})

describe('code block', () => {
  it('shows the language picker and a copy button', async () => {
    const editor = await mountEditor('<pre><code>const a = 1\nconst b = 2</code></pre>')
    expect(editor.isActive('codeBlock')).toBeDefined()
    expect(await screen.findByRole('button', { name: 'Copy code' })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelectorAll('.code-block-container span.block')).toHaveLength(2))
  })
})

describe('VideoControls', () => {
  it('toggles playback and mute on the bound video element', async () => {
    const video = document.createElement('video')
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    render(<VideoControls videoEl={video} />)
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(play).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Mute' }))
    expect(video.muted).toBe(true)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument())
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument()
  })

  it('renders nothing while hidden or without a video', () => {
    const { container, rerender } = render(<VideoControls videoEl={null} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<VideoControls videoEl={document.createElement('video')} hidden />)
    expect(container).toBeEmptyDOMElement()
  })
})
