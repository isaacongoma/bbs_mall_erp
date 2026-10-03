import type { Editor } from '@tiptap/core'
import { useMemo, useState } from 'react'
import { getIframeAllowlist, validateIframeUrl } from '../extensions/iframe/iframe-allowlist'
import {
  calculateAspectRatio,
  detectPlatform,
  getOptimalDimensions,
  processEmbedUrl,
} from '../extensions/iframe/iframe-embed-utils'

function extractSrc(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('<iframe')) {
    return trimmed.match(/\ssrc=["']([^"']+)["']/)?.[1] ?? ''
  }
  return trimmed
}

export interface UseIframeDialogArgs {
  getReplacePos?: () => number | undefined
  initialUrl?: string
}

export function useIframeDialog(editor: Editor, args: UseIframeDialogArgs = {}) {
  const allowlist = useMemo(() => getIframeAllowlist(editor), [editor])
  const [embedInput, setEmbedInput] = useState(args.initialUrl ?? '')
  const [insertError, setInsertError] = useState('')
  const [errorForInput, setErrorForInput] = useState('')

  if (insertError && errorForInput !== embedInput) {
    setInsertError('')
    setErrorForInput('')
  }

  const processedUrl = useMemo(() => {
    const src = extractSrc(embedInput)
    return src ? processEmbedUrl(src) : ''
  }, [embedInput])

  const isValidUrl = useMemo(
    () => !!processedUrl && validateIframeUrl(processedUrl, { allowlist }),
    [processedUrl, allowlist],
  )

  const platformName = useMemo(() => {
    if (!isValidUrl) return 'Generic'
    return detectPlatform(processedUrl)?.name ?? 'Generic'
  }, [isValidUrl, processedUrl])

  const dimensions = useMemo(() => {
    if (!isValidUrl) return { width: 640, height: 360 }
    const info = calculateAspectRatio(processedUrl)
    const dims = getOptimalDimensions(processedUrl, 800)
    return { width: dims.width, height: Math.round(dims.width * info.ratio) }
  }, [isValidUrl, processedUrl])

  const urlError = insertError || (embedInput && !isValidUrl ? 'Please enter a supported URL or iframe embed code' : '')

  const insert = (): boolean => {
    if (!isValidUrl) return false
    const replacePos = args.getReplacePos?.()
    const success =
      replacePos != null
        ? editor.commands.updateIframeAt(replacePos, processedUrl)
        : editor.commands.setIframe({ src: processedUrl, width: dimensions.width, height: dimensions.height })
    if (success) {
      editor.commands.focus()
    } else {
      setInsertError('Failed to insert embed. Please check the URL and try again.')
      setErrorForInput(embedInput)
    }
    return success
  }

  return {
    embedInput,
    setEmbedInput,
    urlError,
    width: dimensions.width,
    height: dimensions.height,
    isValidUrl,
    platformName,
    processedUrl,
    insert,
  }
}
