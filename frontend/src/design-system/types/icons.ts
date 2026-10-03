import type { ComponentType, SVGProps } from 'react'

export interface IconComponentProps {
  className?: string
}

export type IconComponent = ComponentType<IconComponentProps>

export type IconSource = string | IconComponent

export type SvgProps = SVGProps<SVGSVGElement>
