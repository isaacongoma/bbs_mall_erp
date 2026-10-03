import { Toaster } from 'sonner'
import '../../styles/toast.css'

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      expand={false}
      richColors={false}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group py-2.5 flex items-center px-4 bg-surface-gray-9 rounded-md shadow-xl w-[360px] after:bg-transparent',
          title: 'text-p-base font-medium text-ink-base',
          description: 'text-p-base text-ink-base',
          icon: 'mr-2 text-ink-base [&_svg]:size-4',
          closeButton:
            'order-1 ml-auto group-has-[[data-action]]:ml-0 grid place-items-center rounded-sm text-ink-base hover:bg-surface-gray-8 size-5 !transition-colors [&_svg]:size-4',
          actionButton:
            'flex shrink-0 text-ink-blue-link font-medium py-1.5 px-2 h-7 text-base mr-2 ml-auto bg-transparent hover:bg-surface-gray-8 rounded !transition-colors',
          cancelButton:
            'flex text-ink-blue-link font-medium py-1.5 px-2 text-base hover:bg-surface-gray-8 transition-colors',
          error: '[&_[data-icon]]:text-ink-red-5',
          warning: '[&_[data-icon]]:text-ink-amber-5',
        },
      }}
    />
  )
}
