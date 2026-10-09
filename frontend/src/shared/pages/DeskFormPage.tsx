import { useEffect } from 'react'
import { useRoute } from '@/core/navigation'
import { useDoctypeSegment } from '@/shared/frappe/docUrl'
import { __ } from '@/core/i18n'
import { Breadcrumbs, ErrorMessage, usePageMeta } from '@/design-system'
import { DeskFormActivity } from '../components/DeskFormActivity'
import { DeskRecordPanel } from '../components/DeskRecordPanel'
import { FrappeFormBody } from '../components/FrappeFormBody'
import { LayoutHeader } from '../components/LayoutHeader'
import { FrappeFormToolbar } from '../components/FrappeFormToolbar'
import { readPage } from '../frappe/formAdapter'
import { setCurrentLocation } from '../frappe/router'
import { useFrappeForm } from '../hooks/useFrappeForm'
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning'

function documentStatus(docstatus: number): string {
  if (docstatus === 1) return __('Submitted')
  if (docstatus === 2) return __('Cancelled')
  return __('Draft')
}

function FormSkeleton({ doctype, docname }: { doctype: string; docname?: string }) {
  const crumbs = [
    { label: __(doctype), route: `/app/${encodeURIComponent(doctype)}` },
    ...(docname ? [{ label: docname }] : []),
  ]
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader className="h-12" left={<Breadcrumbs items={crumbs} regularParents />} />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 px-8 pt-8">
          <div className="mx-auto flex max-w-[870px] animate-pulse flex-col gap-6">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid grid-cols-2 gap-5">
                {[0, 1].map((col) => (
                  <div key={col} className="flex flex-col gap-2">
                    <div className="h-3 w-24 rounded bg-surface-gray-2" />
                    <div className="h-7 rounded bg-surface-gray-2" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="hidden w-[280px] shrink-0 animate-pulse flex-col gap-3 border-l border-outline-gray-2 p-5 lg:flex">
          <div className="size-24 rounded-xl bg-surface-gray-2" />
          <div className="h-4 w-32 rounded bg-surface-gray-2" />
        </div>
      </div>
    </main>
  )
}

export default function DeskFormPage({
  doctype: doctypeProp,
  docname: docnameProp,
}: { doctype?: string; docname?: string } = {}) {
  const route = useRoute()
  const routedDoctype = useDoctypeSegment(route.params.doctype)
  const doctype = doctypeProp ?? routedDoctype
  const docname = docnameProp ?? (route.params.name ? decodeURIComponent(route.params.name) : undefined)
  const { status, frm, error } = useFrappeForm(doctype, docname)
  const page = frm ? readPage(frm) : null

  useEffect(() => {
    setCurrentLocation(route.path)
  }, [route.path])

  const dirty = Boolean(frm?.is_dirty?.())
  const isNew = Boolean(frm?.is_new?.())
  const isSingle = Boolean(frm?.meta?.issingle)
  const docstatus = Number(frm?.doc?.docstatus ?? 0)
  const submittable = Boolean(frm?.meta?.is_submittable)

  usePageMeta({ title: frm?.docname && !isNew ? `${doctype} ${frm.docname}` : `${__('New')} ${doctype}` })
  useUnsavedChangesWarning(() => dirty)

  if (status === 'error') return <ErrorMessage className="m-6" message={error.message} />
  if (status === 'loading' || !frm || !page) {
    return <FormSkeleton doctype={doctype} docname={docname} />
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <FrappeFormToolbar
        page={page}
        dirty={dirty}
        isNew={isNew}
        docstatusLabel={submittable && !isNew ? documentStatus(docstatus) : undefined}
      />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FrappeFormBody frm={frm} />
          {!isNew && !isSingle && frm.doc?.name && (
            <div id="desk-form-activity">
              <DeskFormActivity hideConnections doctype={doctype} docname={String(frm.doc.name)} doc={frm.doc} />
            </div>
          )}
        </div>
        {!isNew && frm.doc?.name && (!isSingle || Boolean(frm.meta?.track_changes)) && (
          <div className="hidden w-[280px] shrink-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex">
            <DeskRecordPanel
              doctype={doctype}
              docname={String(frm.doc.name)}
              doc={frm.doc}
              readOnly={docstatus > 0 && !dirty}
              hideTags={isSingle}
            />
          </div>
        )}
      </div>
    </main>
  )
}
