import type { ReactNode } from 'react'
import { Button } from '../Button'
import { TabButtons } from '../TabButtons'

export interface ListFooterOptions {
  rowCount?: number
  totalCount?: number
  pageLengthOptions?: number[]
}

export interface ListFooterProps {
  value?: number
  onChange?: (value: number) => void
  onLoadMore?: () => void
  options?: ListFooterOptions
  left?: ReactNode
  right?: ReactNode
}

export function ListFooter({ value = 20, onChange, onLoadMore, options, left, right }: ListFooterProps) {
  const rowCount = options?.rowCount ?? 0
  const totalCount = options?.totalCount ?? 0
  const pageLengthOptions = options?.pageLengthOptions ?? [20, 50, 100]
  const showLoadMore = Boolean(rowCount && totalCount && rowCount < totalCount)

  return (
    <div className="flex justify-between gap-2">
      {left ?? (
        <TabButtons
          value={value}
          onChange={(next) => onChange?.(next as number)}
          options={pageLengthOptions.map((option) => ({ label: option, value: option }))}
        />
      )}
      {right ?? (
        <div className="flex items-center">
          {showLoadMore && <Button label="Load More" onClick={onLoadMore} />}
          {showLoadMore && <div className="mx-3 h-[80%] border-l" />}
          <div className="flex items-center gap-1 text-base text-ink-gray-5">
            <div>{rowCount || '0'}</div>
            <div>of</div>
            <div>{totalCount || '0'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
