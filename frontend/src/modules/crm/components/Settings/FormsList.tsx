import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Badge, Button, Dialog, Dropdown, ErrorMessage, FormControl, toast } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { copyToClipboard } from '@/shared/utils/platform'
import { TARGET_OPTIONS, docLabel, focusRouteEnd, slugify } from '../../utils/formBuilder'

type AnyRecord = Record<string, any>

export interface FormsListHandle {
  reload: () => void
}

export interface FormsListProps {
  onOpen: (name: string) => void
  handleRef?: Ref<FormsListHandle>
}

export function FormsList({ onOpen, handleRef }: FormsListProps) {
  const forms = useResource<AnyRecord[]>({ url: 'crm.api.form.list_forms', auto: true })
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [draft, setDraft] = useState({ title: '', route: '', document_type: 'CRM Lead' })
  const routeEdited = useRef(false)
  const latestReload = useRef(forms.reload)

  useEffect(() => {
    latestReload.current = forms.reload
  })
  useImperativeHandle(handleRef, () => ({ reload: () => void latestReload.current() }), [])

  const rows = forms.data ?? null

  function openCreate() {
    setDraft({ title: '', route: '', document_type: 'CRM Lead' })
    routeEdited.current = false
    setCreateError('')
    setShowCreate(true)
  }

  function onTitleChange(title: string) {
    setDraft((current) => ({ ...current, title, route: routeEdited.current ? current.route : slugify(title) }))
  }

  async function createForm() {
    setCreateError('')
    const route = slugify(draft.route || draft.title)
    if (!draft.title || !route) {
      setCreateError(__('Title and route are required'))
      return
    }
    setCreating(true)
    try {
      const doc = await rpc<AnyRecord>({
        url: 'crm.api.form.save_form',
        params: { name: null, form: { title: draft.title, route, document_type: draft.document_type } },
      })
      setShowCreate(false)
      onOpen(doc.name)
      void forms.reload()
      toast.success(__('Form created'))
    } catch (failure) {
      setCreateError(toErrorMessage(failure) || __('Could not create form'))
    } finally {
      setCreating(false)
    }
  }

  async function togglePublished(form: AnyRecord, value: boolean) {
    try {
      await rpc({ url: 'crm.api.form.set_published', params: { name: form.name, published: value ? 1 : 0 } })
      void forms.reload()
      toast.success(value ? __('Form published') : __('Form unpublished'))
    } catch (failure) {
      void forms.reload()
      toast.error(toErrorMessage(failure) || __('Could not update form'))
    }
  }

  async function deleteForm(form: AnyRecord) {
    await rpc({ url: 'crm.api.form.delete_form', params: { name: form.name } })
    void forms.reload()
    toast.success(__('Form deleted'))
  }

  function rowOptions(form: AnyRecord) {
    return [
      { label: __('Edit'), icon: 'edit-2', onClick: () => onOpen(form.name) },
      {
        label: form.published ? __('Unpublish') : __('Publish'),
        icon: form.published ? 'eye-off' : 'eye',
        onClick: () => void togglePublished(form, !form.published),
      },
      {
        label: __('Copy link'),
        icon: 'link',
        onClick: () => copyToClipboard(`${window.location.origin}/crm-form/${form.route}`),
      },
      ...confirmDeleteOptions({
        isConfirmingDelete: confirmingDelete,
        setConfirmingDelete,
        onConfirmDelete: () => void deleteForm(form),
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <>
      <div className="flex h-full flex-col gap-6 p-6 text-ink-gray-8">
        <div className="flex justify-between px-2 pt-2">
          <div className="flex w-9/12 flex-col gap-1">
            <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Forms')}</h2>
            <p className="text-p-base text-ink-gray-6">
              {__('Capture leads and deals from public forms you embed on your website.')}
            </p>
          </div>
          <div className="item-center flex w-3/12 justify-end space-x-2">
            <Button label={__('New')} iconLeft="lucide-plus" variant="solid" onClick={openCreate} />
          </div>
        </div>

        <div className="flex h-full flex-col overflow-y-auto">
          {forms.loading && !rows ? (
            <div className="mt-12 flex items-center justify-center">
              <LoadingIndicator className="w-4" />
            </div>
          ) : rows?.length === 0 ? (
            <EmptyState
              name="Forms"
              title={__('No web forms yet')}
              description={__('Create one to start capturing leads.')}
              icon="text-cursor-input"
            />
          ) : (
            <div className="w-full">
              <div className="flex items-center p-2 text-sm text-ink-gray-5">
                <div className="w-6/12">{__('Form')}</div>
                <div className="w-3/12">{__('Maps to')}</div>
                <div className="w-3/12">{__('Status')}</div>
              </div>
              <div className="mx-2 h-px border-t border-outline-elevation-2" />
              {(rows ?? []).map((form, index, all) => (
                <div key={form.name}>
                  <div className="flex w-full items-center rounded px-2 py-3 hover:bg-surface-gray-2">
                    <div className="w-6/12 min-w-0 cursor-pointer" onClick={() => onOpen(form.name)}>
                      <div className="truncate text-base-medium text-ink-gray-7">{form.title}</div>
                      <div className="mt-0.5 truncate text-p-base text-ink-gray-5">/crm-form/{form.route}</div>
                    </div>
                    <div className="w-3/12 cursor-pointer text-base text-ink-gray-7" onClick={() => onOpen(form.name)}>
                      {docLabel(form.document_type)}
                    </div>
                    <div className="flex w-3/12 items-center justify-between">
                      <Badge
                        theme={form.published ? 'green' : 'gray'}
                        variant="outline"
                        size="md"
                        label={form.published ? __('Published') : __('Draft')}
                      />
                      <Dropdown placement="right" options={rowOptions(form) as never}>
                        <Button
                          icon="lucide-more-horizontal"
                          variant="ghost"
                          onClick={() => setConfirmingDelete(false)}
                        />
                      </Dropdown>
                    </div>
                  </div>
                  {all.length !== index + 1 && <hr className="mx-2" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title={__('New form')}
        actionsContent={() => (
          <Button
            className="w-full"
            variant="solid"
            label={__('Create form')}
            loading={creating}
            onClick={() => void createForm()}
          />
        )}
      >
        <div className="flex flex-col gap-4">
          <FormControl
            type="text"
            label={__('Title')}
            placeholder={__('Contact sales')}
            value={draft.title}
            onChange={onTitleChange}
          />
          <FormControl
            type="select"
            label={__('Maps to')}
            options={TARGET_OPTIONS}
            value={draft.document_type}
            onChange={(value: string) => setDraft((current) => ({ ...current, document_type: value }))}
          />
          <div>
            <div className="mb-1.5 text-sm text-ink-gray-5">{__('Route')}</div>
            <div
              className="flex h-7 cursor-text items-center rounded border border-transparent bg-surface-gray-2 px-2.5 text-base transition-colors focus-within:border-outline-gray-4 focus-within:bg-surface-base hover:bg-surface-gray-3"
              onClick={focusRouteEnd}
            >
              <span className="shrink-0 text-ink-gray-4">/crm-form/</span>
              <input
                value={draft.route}
                placeholder={__('contact-sales')}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:outline-none focus:ring-0"
                onChange={(event) => {
                  routeEdited.current = true
                  setDraft((current) => ({ ...current, route: event.target.value }))
                }}
              />
            </div>
          </div>
          {createError && <ErrorMessage message={createError} />}
        </div>
      </Dialog>
    </>
  )
}
