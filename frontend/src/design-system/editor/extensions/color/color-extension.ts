import '@tiptap/extension-text-style'

import { Extension } from '@tiptap/core'
import { PALETTE_NAMES } from '../shared/color-palette'
import { extractTextColorFromStyle, textColorStyle } from '../shared/color-style'

export type ColorOptions = {
  types: string[]

  colors: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    namedColor: {
      setColorByName: (colorName: string) => ReturnType

      unsetColor: () => ReturnType
    }
  }
}

export const NamedColorExtension = Extension.create<ColorOptions>({
  name: 'namedColor',

  addOptions() {
    return {
      types: ['textStyle'],
      colors: [...PALETTE_NAMES],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => {
              const style = element.getAttribute('style')
              if (!style) return null
              return extractTextColorFromStyle(style, this.options.colors)
            },
            renderHTML: (attributes) => {
              if (!attributes.color || !this.options.colors.includes(attributes.color)) {
                return {}
              }
              return { style: textColorStyle(attributes.color) }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setColorByName:
        (colorName: string) =>
        ({ chain }) => {
          if (!this.options.colors.includes(colorName)) {
            console.warn(`Color "${colorName}" is not in the allowed colors list`)
            return false
          }
          return chain().setMark('textStyle', { color: colorName }).focus().run()
        },
      unsetColor:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { color: null }).removeEmptyTextStyle().run()
        },
    }
  },
})

export { NamedColorExtension as default }
