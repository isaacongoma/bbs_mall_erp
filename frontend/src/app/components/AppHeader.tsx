import { getShellContributions } from '@/core/modules/registry'

export function AppHeader() {
  const actions = getShellContributions('headerActions')
  return (
    <div className="flex border-b pr-5">
      <div id="app-header" className="flex-1" />
      <div className="flex items-center justify-center">
        {actions.map((Action, index) => (
          <Action key={index} />
        ))}
      </div>
    </div>
  )
}
