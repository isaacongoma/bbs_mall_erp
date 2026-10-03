import TiptapHeading from '@tiptap/extension-heading'
import { textblockTypeInputRule } from '@tiptap/core'

export const Heading = TiptapHeading.extend({
  addInputRules() {
    return this.options.levels.map((level) => {
      const regexp = new RegExp(`^(#{${level}})( |\\u00A0)$`)
      return textblockTypeInputRule({
        find: regexp,
        type: this.type,
        getAttributes: { level },
      })
    })
  },
})
