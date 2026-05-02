import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
}

export function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label
        htmlFor={htmlFor}
        className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-[7px] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-muted)] font-[var(--font-mono)]'

export const textareaClass =
  `${inputClass} resize-none leading-relaxed`
