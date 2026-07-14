import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  /** Small muted helper line under the field */
  hint?: string
}

export function FormField({ label, htmlFor, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label
        htmlFor={htmlFor}
        className="micro text-[var(--color-subtle)]"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[var(--color-subtle)]">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-[7px] px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-placeholder)] font-[var(--font-mono)]'

export const textareaClass =
  `${inputClass} resize-none leading-relaxed`
