import { useObservable } from '@/core/resources'
import {
  ensureViewsLoaded,
  getDefaultView,
  getPinnedViews,
  getPublicViews,
  getViewDetails,
  reloadViews,
  useViewsStore,
} from '../stores/viewsStore'

export function useViews() {
  const resource = ensureViewsLoaded()
  useObservable(resource)
  const defaultViews = useViewsStore((state) => state.defaultViews)
  const standardViews = useViewsStore((state) => state.standardViews)
  useViewsStore((state) => state.viewsByName)

  return {
    views: resource,
    defaultViews,
    standardViews,
    getDefaultView,
    getPinnedViews,
    getPublicViews,
    getView: getViewDetails,
    reload: reloadViews,
  }
}
