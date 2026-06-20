import type { ReactNode } from 'react'

// The centered phone-width container used by every screen.
export default function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-slate-50 shadow-sm">
        {children}
      </div>
    </div>
  )
}
