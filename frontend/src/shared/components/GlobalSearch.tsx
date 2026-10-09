import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dialog, ErrorMessage, FormControl, Spinner } from '@/design-system'
import { TextInput } from '@/design-system'
import {
  addRecentSearch,
  readRecentSearches,
  searchResultPath,
  type RecentSearchItem,
  type SearchResultItem,
  type SearchScope,
} from '../utils/globalSearch'

export function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [doctype, setDoctype] = useState('Employee')
  const [scope, setScope] = useState<SearchScope>('records')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [recent, setRecent] = useState<RecentSearchItem[]>(() => readRecentSearches(window.localStorage))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function search() {
    if (scope === 'records' && !doctype.trim()) return
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const response =
        scope === 'records'
          ? await rpc<unknown>({
              url: '/api/crm/doc/search-link/',
              method: 'POST',
              params: { doctype: doctype.trim(), txt: query.trim(), page_length: 20 },
            })
          : await rpc<unknown>({
              url: 'frappe.desk.search.search_widget',
              method: 'POST',
              params: { doctype: scope === 'reports' ? 'Report' : 'Page', txt: query.trim(), page_length: 20 },
            })
      const payload =
        response && typeof response === 'object' && 'message' in response
          ? (response as { message?: unknown }).message
          : response
      setResults(Array.isArray(payload) ? (payload as SearchResultItem[]) : [])
    } catch (reason) {
      setResults([])
      setError(reason instanceof Error ? reason.message : __('Search failed'))
    } finally {
      setLoading(false)
    }
  }

  function openResult(
    result: SearchResultItem,
    context: { scope: SearchScope; doctype?: string } = { scope, doctype: doctype.trim() },
  ) {
    setOpen(false)
    const nextRecent = addRecentSearch(recent, result, context.scope, context.doctype)
    setRecent(nextRecent)
    window.localStorage.setItem('desk-global-search-recent', JSON.stringify(nextRecent))
    navigate(searchResultPath({ ...result, ...context }))
  }

  function currentContext(): { scope: SearchScope; doctype?: string } {
    return scope === 'records' ? { scope, doctype: doctype.trim() } : { scope }
  }

  return (
    <>
      <Button variant="ghost" iconLeft="lucide-search" label={__('Search')} onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen} title={__('Global Search')} size="lg">
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-[10rem_12rem_minmax(0,1fr)]">
            <FormControl
              type="select"
              value={scope}
              options={[
                { label: __('Records'), value: 'records' },
                { label: __('Reports'), value: 'reports' },
                { label: __('Pages'), value: 'pages' },
              ]}
              onChange={(value: unknown) => setScope(String(value) as 'records' | 'reports' | 'pages')}
            />
            <TextInput
              value={doctype}
              onChange={setDoctype}
              disabled={scope !== 'records'}
              placeholder={__('DocType')}
              aria-label={__('DocType')}
            />
            <TextInput
              value={query}
              onChange={setQuery}
              placeholder={__('Search records')}
              aria-label={__('Search records')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search()
              }}
            />
          </div>
          <Button variant="solid" label={__('Search')} loading={loading} onClick={() => void search()} />
          <ErrorMessage message={error} />
          {loading ? (
            <div className="flex justify-center py-5">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-2">
              {results.map((result) => (
                <button
                  key={result.value}
                  type="button"
                  className="flex flex-col gap-1 p-3 text-left hover:bg-surface-gray-2"
                  onClick={() => openResult(result, currentContext())}
                >
                  <span className="text-sm-medium text-ink-gray-9">{result.label ?? result.value}</span>
                  {result.description && <span className="text-xs text-ink-gray-5">{result.description}</span>}
                </button>
              ))}
              {!results.length && !query && recent.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs-medium uppercase tracking-wide text-ink-gray-5">{__('Recent')}</div>
                  {recent.map((result) => (
                    <button
                      key={`${result.scope}:${result.doctype ?? ''}:${result.value}`}
                      type="button"
                      className="flex flex-col p-3 text-left text-sm text-ink-gray-8 hover:bg-surface-gray-2"
                      onClick={() => openResult(result, result)}
                    >
                      <span>{result.label ?? result.value}</span>
                      <span className="text-xs text-ink-gray-5">
                        {result.scope === 'records' ? result.doctype : result.scope}
                      </span>
                    </button>
                  ))}
                </>
              )}
              {!results.length && query && <div className="p-4 text-sm text-ink-gray-5">{__('No results found')}</div>}
            </div>
          )}
        </div>
      </Dialog>
    </>
  )
}
