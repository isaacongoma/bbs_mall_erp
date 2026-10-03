import { cn } from '@/design-system'
import { useFieldLayout } from '../../hooks/useFieldLayout'
import { CollapsibleSection } from '../CollapsibleSection'
import { Column, type LayoutColumn } from './Column'

export interface LayoutSection {
  name: string
  label?: string
  hidden?: boolean
  hideBorder?: boolean
  hideLabel?: boolean
  opened?: boolean
  collapsible?: boolean
  columns: LayoutColumn[]
}

export interface SectionProps {
  section: LayoutSection
}

export function Section({ section }: SectionProps) {
  const { hasTabs } = useFieldLayout()
  if (section.hidden) return null

  return (
    <div
      className={cn('section', section.hideBorder ? 'pt-4' : 'mt-5 border-t border-outline-elevation-2 pt-5')}
      data-name={section.name}
    >
      <CollapsibleSection
        className={cn('flex flex-col gap-4 text-lg-medium sm:flex-row', hasTabs && 'px-3 sm:px-5')}
        labelClass={cn('text-lg font-medium', hasTabs && 'px-3 sm:px-5')}
        label={section.label}
        hideLabel={section.hideLabel || !section.label}
        opened={section.opened}
        collapsible={section.collapsible}
        collapseIconPosition="right"
      >
        {section.columns.map((column) => (
          <Column
            key={column.name}
            className={section.label && !section.hideLabel ? 'mt-6' : undefined}
            column={column}
          />
        ))}
      </CollapsibleSection>
    </div>
  )
}
