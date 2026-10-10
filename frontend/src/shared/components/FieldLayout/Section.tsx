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
  collapsed?: boolean
  columns: LayoutColumn[]
}

export interface SectionProps {
  section: LayoutSection
}

export function Section({ section }: SectionProps) {
  const { hasTabs, standalone } = useFieldLayout()
  if (section.hidden || section.columns.every((column) => !column.fields.length)) return null

  return (
    <div
      className={cn(
        'section',
        standalone
          ? !section.hideBorder && '[&:not(:first-child)]:border-t [&:not(:first-child)]:border-outline-elevation-2'
          : section.hideBorder
            ? 'pt-4'
            : 'mt-5 border-t border-outline-elevation-2 pt-5',
      )}
      data-name={section.name}
    >
      <div className={cn(standalone && 'mx-auto w-full max-w-[870px] pb-4 pt-5 [.section:first-child_&]:pt-4')}>
        <CollapsibleSection
          className={cn(
            'flex flex-col gap-4 sm:flex-row',
            standalone ? 'text-base-medium' : 'text-lg-medium',
            hasTabs && !standalone && 'px-3 sm:px-5',
          )}
          labelClass={cn(
            standalone ? 'text-base font-medium text-ink-gray-9' : 'text-lg font-medium',
            hasTabs && !standalone && 'px-3 sm:px-5',
          )}
          label={section.label}
          hideLabel={section.hideLabel || !section.label}
          opened={section.opened ?? !section.collapsed}
          collapsible={section.collapsible}
          collapseIconPosition="right"
        >
          {section.columns.map((column) => (
            <Column
              key={column.name}
              className={section.label && !section.hideLabel ? 'mt-6' : undefined}
              column={column}
              single={section.columns.length === 1}
            />
          ))}
        </CollapsibleSection>
      </div>
    </div>
  )
}
