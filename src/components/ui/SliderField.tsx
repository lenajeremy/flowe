import { FormField } from './FormField'

interface SliderFieldProps {
  label: string
  id: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}

export function SliderField({ label, id, min, max, step, value, onChange }: SliderFieldProps) {
  return (
    <FormField label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-[var(--color-border2)] accent-[var(--color-accent)]"
        />
        <span className="text-xs text-[var(--color-text)] w-8 text-right tabular-nums">
          {value.toFixed(1)}
        </span>
      </div>
    </FormField>
  )
}
