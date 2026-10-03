import { useFieldLayoutDialogStore, type FieldLayoutDialogProps } from '../stores/fieldLayoutDialogStore'

export type FormDialogOptions = Omit<FieldLayoutDialogProps, 'onResolve'>

export function renderFieldLayoutDialog(options: FormDialogOptions): Promise<Record<string, any> | null> {
  return new Promise((resolve) => {
    let resolved = false
    const key = `fld-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    useFieldLayoutDialogStore.getState().add({
      key,
      props: {
        ...options,
        onResolve: (result) => {
          if (resolved) return
          resolved = true
          resolve(result)
          setTimeout(() => useFieldLayoutDialogStore.getState().remove(key), 300)
        },
      },
    })
  })
}
