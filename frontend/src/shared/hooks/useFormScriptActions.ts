import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { call } from '@/core/api/rpc'
import { router } from '@/core/navigation'
import { toast } from '@/design-system'
import { useGlobalStore } from '../stores/globalStore'
import { setupCustomizations } from '../utils/customization'

type AnyRecord = Record<string, any>

export interface UseFormScriptActionsInput {
  scripts: unknown[] | null | undefined
  doc: AnyRecord
  updateField: (name: any, value?: any) => void
  deleteDoc: () => void
}

export function useFormScriptActions({ scripts, doc, updateField, deleteDoc }: UseFormScriptActionsInput) {
  const socket = useGlobalStore((state) => state.$socket)
  const dialog = useGlobalStore((state) => state.$dialog)
  const [actions, setActions] = useState<AnyRecord[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const customized = useRef(false)

  const run = useEffectEvent(async (loaded: AnyRecord) => {
    const result = await setupCustomizations(scripts as never, {
      doc: loaded,
      $dialog: dialog,
      $socket: socket,
      router,
      toast,
      updateField,
      createToast: toast.create,
      deleteDoc,
      call,
    })
    setActions((result.actions || []) as AnyRecord[])
    setStatuses((result.statuses || []) as unknown as string[])
  })

  useEffect(() => {
    if (customized.current || !doc.name || !scripts?.length) return
    customized.current = true
    void run(doc)
  }, [doc, scripts])

  return { actions, statuses }
}
