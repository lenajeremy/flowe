interface SelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}

export function Select({ id, value, onChange, options }: SelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors appearance-none cursor-pointer font-[var(--font-mono)]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[var(--color-surface2)]">
          {opt.label}
        </option>
      ))}
    </select>
  )
}
