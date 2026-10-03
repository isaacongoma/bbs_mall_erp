import type { Editor } from '@tiptap/core'
import { isSafeUrl, matchesHostname } from '../shared/url-safety'

export const IFRAME_ALLOWLIST: readonly string[] = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'codepen.io',
  'codesandbox.io',
  'figma.com',
  'embed.figma.com',
  'docs.google.com',
  'drive.google.com',
  'notion.so',
]

export const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation' as const

export function getIframeAllowlist(editor: Editor): readonly string[] | undefined {
  return editor.extensionManager?.extensions.find((extension) => extension.name === 'iframe')?.options.allowlist as
    readonly string[] | undefined
}

export function allowlistPermitsHosts(editor: Editor, hosts: readonly string[]): boolean {
  const allowlist = getIframeAllowlist(editor) ?? IFRAME_ALLOWLIST
  return hosts.some((host) => matchesHostname(host, allowlist))
}

export interface ValidateIframeUrlOptions {
  allowlist?: readonly string[]
  blocklist?: readonly string[]
}

export function validateIframeUrl(url: string, options?: ValidateIframeUrlOptions): boolean {
  if (!isSafeUrl(url, { allowedSchemes: ['http', 'https'] })) return false

  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }

  const blocklist = options?.blocklist
  if (blocklist?.length && matchesHostname(host, blocklist)) return false

  const allowlist = options?.allowlist ?? IFRAME_ALLOWLIST
  return matchesHostname(host, allowlist)
}
