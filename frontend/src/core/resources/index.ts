export { getConfig, setConfig } from './config'
export {
  createDocumentResource,
  getCachedDocumentResource,
  type DocumentResource,
  type DocumentResourceOptions,
} from './documentResource'
export {
  createListResource,
  deleteRowInListResource,
  getCachedListResource,
  revertRowInListResource,
  updateRowInListResource,
  type ListResource,
  type ListResourceOptions,
} from './listResource'
export { createResource, getCachedResource, type Resource, type ResourceOptions } from './resource'
export { useDocumentResource, useListResource, useObservable, useResource } from './hooks'
export { Observable, ObservableValue } from './observable'
export type { DocRecord } from './types'
