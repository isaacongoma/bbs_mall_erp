import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { useCallback } from 'react'
import { PALETTE_NAMES } from '../extensions/shared/color-palette'

export interface NamedColorState {
  activeTextColor: string | null
  activeHighlightColor: string | null
  setText: (name: string | null) => void
  setHighlight: (name: string | null) => void
}

function firstActive(probe: (name: string) => boolean): string | null {
  for (const name of PALETTE_NAMES) {
    if (probe(name)) return name
  }
  return null
}

export function useNamedColorState(editor: Editor): NamedColorState {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      !current || current.isDestroyed
        ? { text: null, highlight: null }
        : {
            text: firstActive((name) => current.isActive('textStyle', { color: name })),
            highlight: firstActive((name) => current.isActive('namedHighlight', { color: name })),
          },
  })

  const setText = useCallback(
    (name: string | null) => {
      if (editor.isDestroyed) return
      if (name) editor.chain().focus().setColorByName(name).run()
      else editor.chain().focus().unsetColor().run()
    },
    [editor],
  )

  const setHighlight = useCallback(
    (name: string | null) => {
      if (editor.isDestroyed) return
      if (name) editor.chain().focus().toggleHighlightByName(name).run()
      else editor.chain().focus().unsetHighlight().run()
    },
    [editor],
  )

  return { activeTextColor: active.text, activeHighlightColor: active.highlight, setText, setHighlight }
}
