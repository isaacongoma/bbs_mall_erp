import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { Link } from 'react-router-dom'
import { resolveLocation } from './routeTable'
import type { RouteLocation } from './types'

export interface RouteLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, 'to'> {
  to: RouteLocation
}

export const RouteLink = forwardRef<HTMLAnchorElement, RouteLinkProps>(function RouteLink({ to, ...rest }, ref) {
  return <Link ref={ref} to={resolveLocation(to)} {...rest} />
})
