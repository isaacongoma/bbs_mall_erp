export { useRoute, useRouter } from './hooks'
export { RouteLink, type RouteLinkProps } from './RouteLink'
export { RouterBridge } from './RouterBridge'
export { bindRouter, getCurrentRoute, getRouter, router, type CrmRouter } from './router'
export {
  buildPath,
  getRouteDefinition,
  matchLocation,
  normalizeHash,
  registerRoutes,
  resolveLocation,
  serializeQuery,
} from './routeTable'
export type { CurrentRoute, NamedLocation, RouteDefinition, RouteLocation, RouteParams } from './types'
export {
  canonicalPath,
  routeKnowledgeReady,
  setRouteKnowledge,
  subscribeRouteKnowledge,
  toInternal,
} from './canonicalPath'
