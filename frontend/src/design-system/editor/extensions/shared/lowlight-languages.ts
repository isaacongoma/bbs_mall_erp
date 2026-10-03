import type { createLowlight } from 'lowlight'

export interface EditorLanguage {
  label: string
  value: string
}

export function listEditorLanguages(lowlight: ReturnType<typeof createLowlight>): EditorLanguage[] {
  const seen = new Set<string>()
  const languages: EditorLanguage[] = []

  const push = (label: string, value: string) => {
    if (seen.has(value)) return
    seen.add(value)
    languages.push({ label, value })
  }

  for (const name of lowlight.listLanguages()) {
    push(name, name)
  }

  if (!languages.some((language) => language.label === 'html')) {
    languages.push({ label: 'html', value: 'xml' })
  }

  return languages.sort((a, b) => a.label.localeCompare(b.label))
}
