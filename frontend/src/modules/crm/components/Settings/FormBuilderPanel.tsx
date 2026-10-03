import '../../styles/forms.css'
import { useEffect, useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { Badge, Button, Switch, Tabs, confirmDialog, createDialog } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { useFormBuilder } from '../../hooks/useFormBuilder'
import { FormBuilderEditor } from './FormBuilderEditor'
import { FormBuilderPreview } from './FormBuilderPreview'
import { FormBuilderSettings } from './FormBuilderSettings'
import { FormBuilderShare } from './FormBuilderShare'

export interface FormBuilderPanelProps {
  name: string
  onBack: () => void
  onSaved: () => void
}

function autoGrow(element: HTMLTextAreaElement | null) {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

export function FormBuilderPanel({ name, onBack, onSaved }: FormBuilderPanelProps) {
  const builder = useFormBuilder(name, onSaved)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [tabIndex, setTabIndex] = useState(0)
  const [previewKey, setPreviewKey] = useState(0)
  const description = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || tabIndex !== 0) return
    let frame = 0
    function size(tries = 0) {
      frame = requestAnimationFrame(() => {
        const element = description.current
        if (!element) return
        if (!element.clientWidth && tries < 20) {
          size(tries + 1)
          return
        }
        autoGrow(element)
      })
    }
    size()
    void document.fonts?.ready?.then(() => size())
    return () => cancelAnimationFrame(frame)
  }, [mode, tabIndex, builder.loaded, builder.form.description])

  const tabs = [
    { name: 'editor', label: __('Editor'), icon: 'lucide-layout-list' },
    { name: 'settings', label: __('Settings'), icon: 'lucide-settings' },
    { name: 'share', label: __('Share'), icon: 'lucide-share-2' },
  ]

  function goBack() {
    if (builder.dirty) {
      createDialog({
        title: __('Unsaved Changes'),
        message: __('Are you sure you want to go back? Unsaved changes will be lost.'),
        actions: [
          {
            label: __('Go Back'),
            variant: 'solid',
            onClick: ({ close }) => {
              onBack()
              close()
            },
          },
        ],
      })
      return
    }
    onBack()
  }

  function togglePreview() {
    setMode((current) => (current === 'edit' ? 'preview' : 'edit'))
    setPreviewKey((key) => key + 1)
  }

  function requestDoctype(doctype: string) {
    void builder.requestDoctypeChange(doctype, (message, accept) => {
      confirmDialog({
        title: __('Change form type?'),
        message,
        onConfirm: ({ close }: { close: () => void }) => {
          accept()
          close()
        },
      } as never)
    })
  }

  return (
    <div className="flex h-full flex-col text-ink-gray-8">
      <div className="flex items-center justify-between px-6 pb-4 pt-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={builder.form.title || __('Untitled')}
            size="md"
            className="-ml-4 !max-w-96 cursor-pointer !justify-start !pr-0 text-lg-semibold text-ink-gray-7 no-underline hover:bg-transparent hover:no-underline hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0"
            onClick={goBack}
          />
          {builder.dirty && <Badge variant="subtle" theme="orange" size="sm" label={__('Not Saved')} />}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-7 items-center justify-between gap-2" onClick={builder.togglePublish}>
            <Switch size="sm" value={Boolean(builder.form.published)} />
            <span className="text-sm text-ink-gray-7">{__('Publish')}</span>
          </div>
          <Button
            label={mode === 'edit' ? __('Preview') : __('Edit')}
            iconLeft={mode === 'edit' ? 'lucide-eye' : 'lucide-pencil'}
            onClick={togglePreview}
          />
          <Button
            disabled={!builder.dirty}
            label={__('Save')}
            theme="gray"
            variant="solid"
            loading={builder.saving}
            onClick={() => void builder.saveNow()}
          />
        </div>
      </div>

      {builder.loaded ? (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {mode === 'edit' ? (
            <div className="wf-tabs">
              <Tabs
                tabs={tabs}
                value={tabIndex}
                onChange={setTabIndex}
                tabPanel={({ tab }) =>
                  tab.name === 'editor' ? (
                    <FormBuilderEditor
                      builder={builder}
                      descriptionRef={(element) => {
                        description.current = element
                      }}
                      autoGrow={autoGrow}
                    />
                  ) : tab.name === 'settings' ? (
                    <FormBuilderSettings builder={builder} onRequestDoctype={requestDoctype} />
                  ) : (
                    <FormBuilderShare builder={builder} />
                  )
                }
              />
            </div>
          ) : (
            <FormBuilderPreview key={previewKey} builder={builder} />
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <LoadingIndicator className="size-6" />
        </div>
      )}
    </div>
  )
}
