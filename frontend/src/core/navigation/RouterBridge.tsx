import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { bindRouter, rememberPreviousRoute } from './router'
import { matchLocation } from './routeTable'
import { canonicalPath, routeKnowledgeReady, subscribeRouteKnowledge } from './canonicalPath'

export function RouterBridge() {
  const navigate = useNavigate()
  const known = useSyncExternalStore(subscribeRouteKnowledge, routeKnowledgeReady)
  const location = useLocation()
  const locationRef = useRef(location)
  const previousRef = useRef(location)

  useEffect(() => {
    locationRef.current = location
    const last = previousRef.current
    if (last !== location) {
      rememberPreviousRoute(matchLocation(last.pathname, last.search, last.hash))
      previousRef.current = location
    }
  }, [location])

  useEffect(() => {
    if (!known) return
    const target = canonicalPath(location.pathname)
    if (target !== location.pathname) navigate(`${target}${location.search}${location.hash}`, { replace: true })
  }, [known, location, navigate])

  useEffect(() => {
    bindRouter({
      navigate: (to, options) => navigate(canonicalPath(to), options),
      back: () => navigate(-1),
      forward: () => navigate(1),
      getLocation: () => locationRef.current,
    })
  }, [navigate])

  return null
}
