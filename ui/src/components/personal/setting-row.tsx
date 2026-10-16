import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function SettingsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
        {children}
      </div>
    </section>
  )
}

/** One preference: label and help text on the left, its control on the right
 * (stacked on narrow screens). `htmlFor` ties the label to the control. */
export function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: ReactNode
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function OptionSelect({
  id,
  value,
  options,
  onChange,
}: {
  id?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger id={id} className="w-full sm:w-56">
        <SelectValue>{selected?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
