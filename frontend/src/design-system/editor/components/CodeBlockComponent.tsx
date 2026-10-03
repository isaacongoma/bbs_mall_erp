import * as RadixTooltip from '@radix-ui/react-tooltip'
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import type { createLowlight } from 'lowlight'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Combobox } from '../../components/Combobox'
import { TooltipBubble } from '../../components/Tooltip'
import type { ComboboxOption } from '../../types/combobox'
import { cn } from '../../utils/cn'
import { listEditorLanguages } from '../extensions/shared/lowlight-languages'
import { useNodeViewEditable } from '../hooks/useNodeViewEditable'

type Lowlight = ReturnType<typeof createLowlight>

function copyViaExecCommand(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function CodeBlockComponent({ node, editor, extension, updateAttributes, selected }: ReactNodeViewProps) {
  const isEditable = useNodeViewEditable(editor)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const language = (node.attrs.language as string | null) ?? ''
  const lineCount = node.textContent.split('\n').length

  const languageOptions = useMemo<ComboboxOption[]>(() => {
    const lowlight = extension.options.lowlight as Lowlight
    return [
      { label: 'auto', value: '' },
      ...listEditorLanguages(lowlight).map(({ label, value }) => ({ label, value })),
    ]
  }, [extension])

  const markCopied = () => {
    setCopied(true)
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const copyCode = async () => {
    const text = node.textContent
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else copyViaExecCommand(text)
      markCopied()
    } catch {
      try {
        copyViaExecCommand(text)
        markCopied()
      } catch (error) {
        console.error('Failed to copy code block', error)
      }
    }
  }

  return (
    <NodeViewWrapper>
      <div className="code-block-container group relative">
        <pre className="flex items-start gap-5 !pl-3">
          <span
            className="flex flex-none select-none flex-col items-end border-outline-gray-2 text-ink-gray-4"
            aria-hidden="true"
            contentEditable={false}
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <span key={index} className="block">
                {index + 1}
              </span>
            ))}
          </span>
          <code className="min-w-0 flex-1 overflow-x-auto">
            <NodeViewContent />
          </code>
        </pre>
        <div
          className={cn(
            'absolute right-0 top-0 flex items-center gap-0.5 pr-2 pt-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
            (languageMenuOpen || selected) && 'opacity-100',
          )}
          contentEditable={false}
        >
          {isEditable ? (
            <Combobox
              value={language}
              onChange={(value) => updateAttributes({ language: value ? String(value) : null })}
              options={languageOptions}
              trigger="button"
              variant="ghost"
              size="sm"
              placeholder="auto"
              onOpenChange={setLanguageMenuOpen}
            />
          ) : (
            <span className="select-none px-1 text-xs text-ink-gray-4">{node.attrs.language || 'auto'}</span>
          )}
          <RadixTooltip.Provider delayDuration={500}>
            <RadixTooltip.Root>
              <RadixTooltip.Trigger asChild>
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label="Copy code"
                  icon={copied ? 'lucide-check' : 'lucide-copy'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation()
                    void copyCode()
                  }}
                />
              </RadixTooltip.Trigger>
              <TooltipBubble text={copied ? 'Copied!' : 'Copy code'} />
            </RadixTooltip.Root>
          </RadixTooltip.Provider>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
