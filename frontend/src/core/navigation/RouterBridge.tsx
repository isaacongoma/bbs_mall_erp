import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { bindRouter, rememberPreviousRoute } from './router'
import { matchLocation } from './routeTable'

export function RouterBridge() {
  const navigate = useNavigate()
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
    bindRouter({
      navigate: (to, options) => navigate(to, options),
      back: () => navigate(-1),
      forward: () => navigate(1),
      getLocation: () => locationRef.current,
    })
  }, [navigate])

  return null
}
