import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-zinc-400">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-zinc-100',
            'transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-card">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
