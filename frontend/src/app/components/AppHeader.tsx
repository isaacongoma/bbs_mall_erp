import { getShellContributions } from '@/core/modules/registry'
import { useRoute } from '@/core/navigation'
import { GlobalSearch } from '@/shared/components/GlobalSearch'

export function AppHeader() {
  const route = useRoute()
  const actions = getShellContributions('headerActions')
  const desk = route.path.startsWith('/app') && !route.path.startsWith('/app/notifications')
  return (
    <div className="flex border-b pr-5">
      <div id="app-header" className="flex-1" />
      <div className="flex items-center justify-center">
        <div className={desk ? 'hidden' : 'contents'}>
          <GlobalSearch />
        </div>
        {!desk && actions.map((Action, index) => <Action key={index} />)}
      </div>
    </div>
  )
}
