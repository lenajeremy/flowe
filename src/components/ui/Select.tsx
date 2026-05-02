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
      className="w-full cursor-pointer appearance-none rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[var(--color-surface2)]">
          {opt.label}
        </option>
      ))}
    </select>
  )
}
