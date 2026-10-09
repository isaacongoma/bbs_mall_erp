import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { getRailModules } from '@/core/modules/registry'
import { usePageMeta } from '@/design-system'
import { Icon } from '../components/Icon'
import { useDeskShell } from '../hooks/useDeskShell'
import { useDeskShellStore } from '../stores/deskShellStore'
import { appLogo } from '../utils/appLogos'
import { shellLanding, visibleDock } from '../utils/deskShell'

export default function DeskAppsPage() {
  const navigate = useNavigate()
  const shell = useDeskShell()
  const setApp = useDeskShellStore((state) => state.setApp)
  usePageMeta({ title: __('Apps') })
  const modules = getRailModules()

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap justify-center gap-10 px-6 py-16">
        {shell.apps.map((app) => {
          const first = visibleDock(shell, app.app_name)[0]
          return (
            <button
              key={app.app_name}
              type="button"
              className="flex w-28 flex-col items-center gap-3"
              onClick={() => {
                setApp(app.app_name, first?.link_to ?? '')
                navigate(first ? (shellLanding(shell, first.link_to) ?? '/app') : '/app')
              }}
            >
              <span className="flex size-14 items-center justify-center overflow-hidden rounded-xl bg-surface-gray-2">
                <img src={appLogo(app.app_name, app.app_logo_url)} alt="" className="size-14" />
              </span>
              <span className="text-sm-medium text-ink-gray-7">{app.app_title}</span>
            </button>
          )
        })}
        {modules.map((module) => (
          <button
            key={module.id}
            type="button"
            className="flex w-28 flex-col items-center gap-3"
            onClick={() => {
              setApp(module.id)
              const first = module.navigation?.[0]
              navigate(first && typeof first.to === 'string' ? first.to : '/')
            }}
          >
            <span className="flex size-14 items-center justify-center rounded-xl bg-surface-gray-2">
              {module.icon && <Icon icon={module.icon} className="size-7 text-ink-gray-7" />}
            </span>
            <span className="text-sm-medium text-ink-gray-7">{module.label}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
