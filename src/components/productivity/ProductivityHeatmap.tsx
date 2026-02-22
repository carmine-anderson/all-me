import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useProductivityCheckins } from '@/hooks/useProductivity'
import { useUIStore } from '@/store/uiStore'
import { generateHeatmapDates, heatmapColor, levelLabel, cn } from '@/lib/utils'
import type { HeatmapDay } from '@/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ProductivityHeatmap() {
  const { data: checkins = [] } = useProductivityCheckins()
  const setCheckinModalOpen = useUIStore((s) => s.setCheckinModalOpen)
  const [tooltip, setTooltip] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null)

  // Build a lookup map: date → level
  const checkinMap = useMemo(() => {
    const map = new Map<string, { level: number; note: string | null }>()
    checkins.forEach((c) => map.set(c.checkinDate, { level: c.level, note: c.note }))
    return map
  }, [checkins])

  // Generate all dates for the past 52 weeks
  const allDates = useMemo(() => generateHeatmapDates(52), [])

  // Group into weeks (columns of 7)
  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = []
    let week: HeatmapDay[] = []
    allDates.forEach((date, i) => {
      const entry = checkinMap.get(date)
      week.push({
        date,
        level: (entry?.level ?? 0) as HeatmapDay['level'],
        note: entry?.note ?? null,
      })
      if ((i + 1) % 7 === 0) {
        result.push(week)
        week = []
      }
    })
    if (week.length > 0) result.push(week)
    return result
  }, [allDates, checkinMap])

  // Month label positions — skip a label if it's fewer than 3 cols from the previous one
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    let lastCol = -999
    weeks.forEach((week, col) => {
      const firstDay = week[0]
      if (!firstDay) return
      const month = parseISO(firstDay.date).getMonth()
      if (month !== lastMonth && col - lastCol >= 3) {
        labels.push({ label: MONTH_LABELS[month], col })
        lastMonth = month
        lastCol = col
      }
    })
    return labels
  }, [weeks])

  const today = format(new Date(), 'yyyy-MM-dd')

  // Cell size in px: cell (16px) + gap (3px) = 19px per column
  const CELL_SIZE = 16
  const CELL_GAP = 3
  const CELL_STEP = CELL_SIZE + CELL_GAP
  const DAY_LABEL_WIDTH = 36

  return (
    <div className="relative">
      {/* Month labels — fixed height so the grid row starts below them */}
      <div className="relative mb-1" style={{ height: 16, paddingLeft: DAY_LABEL_WIDTH }}>
        {monthLabels.map(({ label, col }) => (
          <div
            key={`${label}-${col}`}
            className="absolute text-xs text-zinc-500"
            style={{ left: DAY_LABEL_WIDTH + col * CELL_STEP, top: 0 }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {/* Day-of-week labels */}
        <div className="flex flex-col" style={{ gap: CELL_GAP, width: DAY_LABEL_WIDTH, flexShrink: 0 }}>
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={cn('flex items-center text-xs text-zinc-600', i % 2 !== 0 && 'invisible')}
              style={{ height: CELL_SIZE }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex overflow-x-auto pb-1" style={{ gap: CELL_GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: CELL_GAP }}>
              {week.map((day, di) => {
                const isToday = day.date === today
                const isFuture = day.date > today
                return (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: isFuture ? 0.2 : 1, scale: 1 }}
                    transition={{ delay: (wi * 7 + di) * 0.001, duration: 0.2 }}
                    className={cn(
                      'heatmap-cell cursor-pointer',
                      heatmapColor(isFuture ? 0 : day.level),
                      isToday && 'ring-1 ring-brand-400 ring-offset-1 ring-offset-surface-card'
                    )}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }}
                    onClick={() => {
                      if (day.date === today) setCheckinModalOpen(true)
                    }}
                    onMouseEnter={(e) => {
                      if (!isFuture) {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({ day, x: rect.left, y: rect.top })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    title={`${day.date}: ${levelLabel(day.level)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-zinc-500">Less</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <div key={l} className={cn('rounded-sm', heatmapColor(l).split(' ')[0])} style={{ width: CELL_SIZE, height: CELL_SIZE }} />
        ))}
        <span className="text-xs text-zinc-500">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 shadow-xl"
          style={{ left: tooltip.x + 16, top: tooltip.y - 8 }}
        >
          <p className="text-xs font-medium text-zinc-100">
            {format(parseISO(tooltip.day.date), 'MMMM d, yyyy')}
          </p>
          <p className="text-xs text-zinc-400">{levelLabel(tooltip.day.level)}</p>
          {tooltip.day.note && (
            <p className="mt-1 max-w-[200px] text-xs text-zinc-500">{tooltip.day.note}</p>
          )}
        </div>
      )}
    </div>
  )
}
