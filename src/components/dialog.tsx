import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface AlertOptions {
  title: string
  message?: string
  confirmLabel?: string
}

interface DialogState {
  kind: 'confirm' | 'alert'
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  resolve: (value: boolean) => void
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

const DialogContext = createContext<DialogApi | null>(null)

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}

// App-styled replacement for window.confirm / window.alert so dialogs look like
// part of SplitWise instead of the browser's "site says" popup.
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) =>
        setState({ kind: 'confirm', ...options, resolve }),
      ),
    [],
  )

  const alert = useCallback(
    (options: AlertOptions) =>
      new Promise<void>((resolve) =>
        setState({ kind: 'alert', ...options, resolve: () => resolve() }),
      ),
    [],
  )

  function close(value: boolean) {
    state?.resolve(value)
    setState(null)
  }

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          role="dialog"
          aria-modal="true"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900">{state.title}</h2>
            {state.message && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {state.message}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              {state.kind === 'confirm' && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 active:scale-95"
                >
                  {state.cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white active:scale-95 ${
                  state.destructive ? 'bg-rose-600' : 'bg-teal-700'
                }`}
              >
                {state.confirmLabel ?? (state.kind === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
