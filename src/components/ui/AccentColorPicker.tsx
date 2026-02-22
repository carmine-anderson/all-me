import { useTheme } from '@/hooks/useTheme'
import type { AccentColor } from '@/types'

interface AccentOption {
  value: AccentColor
  label: string
  /** Tailwind-safe inline style color for the swatch (avoids purge issues) */
  hex: string
}

const ACCENT_OPTIONS: AccentOption[] = [
  { value: 'green',  label: 'Green',  hex: '#10b981' },
  { value: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'pink',   label: 'Pink',   hex: '#ec4899' },
  { value: 'red',    label: 'Red',    hex: '#f4395e' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'yellow', label: 'Yellow', hex: '#eab308' },
]

export function AccentColorPicker() {
  const { accent, setAccent } = useTheme()

  return (
    <div className="flex flex-wrap gap-3">
      {ACCENT_OPTIONS.map((opt) => {
        const isActive = accent === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => setAccent(opt.value)}
            className="group relative flex flex-col items-center gap-1.5 focus-visible:outline-none"
          >
            {/* Swatch */}
            <span
              className="block h-8 w-8 rounded-full transition-all duration-150 group-hover:scale-110"
              style={{
                backgroundColor: opt.hex,
                boxShadow: isActive
                  ? `0 0 0 2px #09090b, 0 0 0 4px ${opt.hex}`
                  : undefined,
              }}
            />
            {/* Label */}
            <span
              className="text-[10px] font-medium transition-colors"
              style={{ color: isActive ? opt.hex : undefined }}
            >
              {isActive ? (
                <span className="font-semibold">{opt.label}</span>
              ) : (
                <span className="text-zinc-500 group-hover:text-zinc-300">{opt.label}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
