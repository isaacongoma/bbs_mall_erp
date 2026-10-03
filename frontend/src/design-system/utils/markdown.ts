import { marked } from 'marked'

export function markdownToHTML(text: string): string {
  return marked.parse(text, { gfm: true, breaks: true, async: false }) as string
}

export function detectMarkdown(text: string): boolean {
  return text
    .split('\n')
    .some(
      (line) =>
        /!\[.*\]\(.*\)/.test(line) ||
        /\[.*\]\(.*\)/.test(line) ||
        /(^|\s)\*.*\*(\s|$)/.test(line) ||
        /(^|\s)_.*_(\s|$)/.test(line) ||
        /(^|\s)\*\*.*\*\*(\s|$)/.test(line) ||
        /(^|\s)__.*__(\s|$)/.test(line) ||
        /(^|\s)~~.*~~(\s|$)/.test(line) ||
        line.startsWith('![') ||
        line.startsWith('#') ||
        line.startsWith('> ') ||
        line.startsWith('*') ||
        line.startsWith('- ') ||
        line.startsWith('1. ') ||
        line.startsWith('```') ||
        line.startsWith('`') ||
        line.startsWith('[') ||
        line.startsWith('---'),
    )
}
