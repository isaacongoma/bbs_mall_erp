import { Extension, type Range } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import type { ComponentType } from 'react'
import type { Editor } from './types/editor'
import { createSuggestionRenderer, type SuggestionFloatingOptions } from './extensions/shared/suggestion-renderer'

export type SuggestionRange = { from: number; to: number }

export type SuggestionExtensionOptions<TItem = any> = {
  name: string
  trigger: string
  items: TItem[] | ((query: string) => TItem[] | Promise<TItem[]>)
  component?: ComponentType<any>
  floatingOptions?: SuggestionFloatingOptions
  allowSpaces?: boolean
  command: (props: { editor: Editor; item: TItem; range: SuggestionRange }) => void
}

function buildSuggestionExtension<TItem = any>(options: SuggestionExtensionOptions<TItem>) {
  return Extension.create({
    name: options.name,
    addOptions() {
      const SuggestionComponent = options.component
      return {
        suggestion: {
          char: options.trigger,
          allowSpaces: options.allowSpaces,
          pluginKey: new PluginKey(options.name),
          items: ({ query }: { query: string }) =>
            typeof options.items === 'function' ? options.items(query) : options.items,
          command: ({ editor, range, props }: { editor: Editor; range: Range; props: TItem }) => {
            options.command({ editor, item: props, range })
          },
          render: SuggestionComponent
            ? () => createSuggestionRenderer(SuggestionComponent, options.floatingOptions)
            : undefined,
        },
      }
    },
    addProseMirrorPlugins() {
      return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
    },
  })
}

export const SuggestionExtension = {
  configure: buildSuggestionExtension,
}
