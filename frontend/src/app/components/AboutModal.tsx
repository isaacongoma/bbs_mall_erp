import { useBootStore } from '@/core/boot/bootStore'
import { __ } from '@/core/i18n'
import { Dialog } from '@/design-system'
import { CRMLogo } from '@/modules/crm/components/Icons'

export interface AboutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const version = useBootStore((state) => state.boot.bbs_erp_version)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      body={
        <div className="p-4 pt-5">
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <CRMLogo className="mb-3 size-12" />
              <h3 className="text-2xl-semibold text-ink-gray-9">BBS MALL ERP</h3>
              {version && <p className="mt-1 text-sm text-ink-gray-5">{__('Version {0}', [version])}</p>}
            </div>
          </div>
        </div>
      }
    />
  )
}
