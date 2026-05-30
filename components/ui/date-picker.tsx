'use client'

import * as React from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, parseISO, isValid, addMonths, subMonths, addYears, subYears, getYear, getMonth } from 'date-fns'
import { DayButton, DayPicker } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ─── Public API ──────────────────────────────────────────────────────────────

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Main component ──────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
  allowClear,
  triggerClassName,
  align = 'start',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  // 'days'  — standard calendar grid
  // 'picker' — month/year quick-jump overlay
  const [view, setView] = React.useState<'days' | 'picker'>('days')
  const [viewMonth, setViewMonth] = React.useState<Date>(() => parseDateValue(value) ?? new Date())
  const selected = parseDateValue(value)


  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevYear  = () => setViewMonth(d => subYears(d, 1))
  const prevMonth = () => setViewMonth(d => subMonths(d, 1))
  const nextMonth = () => setViewMonth(d => addMonths(d, 1))
  const nextYear  = () => setViewMonth(d => addYears(d, 1))

  function handlePickMonth(monthIndex: number) {
    setViewMonth(new Date(getYear(viewMonth), monthIndex, 1))
    setView('days')
  }

  function handleClose(o: boolean) {
    if (o) {
      // Popover is opening — jump to the selected date's month
      setViewMonth(parseDateValue(value) ?? new Date())
      setView('days')
    }
    setOpen(o)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Popover open={open} onOpenChange={handleClose}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 text-left text-sm font-medium',
            !value && 'text-muted-foreground/40',
            triggerClassName,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          <span className="flex-1 truncate">
            {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
          </span>
          {allowClear && value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground/70 focus:outline-none"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange('') }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[272px] p-0 bg-[#101010] border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden"
      >
        {/* ── Shared header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 px-2.5 pt-2.5 pb-1">
          <NavBtn onClick={prevYear} label="Previous year"><DoubleChevron dir="left" /></NavBtn>
          <NavBtn onClick={prevMonth} label="Previous month"><SingleChevron dir="left" /></NavBtn>
          <button
            type="button"
            onClick={() => setView(v => v === 'picker' ? 'days' : 'picker')}
            className="flex-1 rounded-md py-1 text-sm font-semibold text-foreground/75 transition-colors duration-100 hover:bg-white/[0.05] hover:text-foreground"
          >
            {format(viewMonth, 'MMMM yyyy')}
          </button>
          <NavBtn onClick={nextMonth} label="Next month"><SingleChevron dir="right" /></NavBtn>
          <NavBtn onClick={nextYear} label="Next year"><DoubleChevron dir="right" /></NavBtn>
        </div>

        {/* ── Calendar view ────────────────────────────────────────────────── */}
        {view === 'days' && (
          <DayPicker
            mode="single"
            selected={selected}
            month={viewMonth}
            onMonthChange={setViewMonth}
            fixedWeeks
            showOutsideDays
            onSelect={(day) => {
              onChange(day ? format(day, 'yyyy-MM-dd') : '')
              if (day) setOpen(false)
            }}
            className="px-2.5 pb-2.5"
            classNames={{
              root: 'w-full',
              months: 'w-full',
              month: 'w-full',
              month_caption: 'hidden',
              nav: 'hidden',
              weekdays: 'flex mb-0.5',
              weekday: 'flex-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/35 select-none pb-1',
              weeks: 'w-full space-y-0.5',
              week: 'flex gap-0.5',
              day: 'relative flex-1 aspect-square p-0 text-center',
              outside: '',
              disabled: 'opacity-25 cursor-not-allowed',
              hidden: 'invisible',
            }}
            components={{ DayButton: DatePickerDayButton }}
          />
        )}

        {/* ── Month / year picker overlay ──────────────────────────────────── */}
        {view === 'picker' && (
          <div className="px-2.5 pb-2.5">
            {/* Year display (navigation is via the shared header buttons) */}
            <p className="mb-2.5 text-center text-xs font-bold tracking-widest text-muted-foreground/40 uppercase select-none">
              {getYear(viewMonth)}
            </p>
            {/* 3 × 4 month grid */}
            <div className="grid grid-cols-3 gap-1">
              {MONTH_ABBREVS.map((label, mi) => {
                const isCurrentView = getMonth(viewMonth) === mi
                const isSelectedMonth =
                  selected &&
                  getYear(selected) === getYear(viewMonth) &&
                  getMonth(selected) === mi
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handlePickMonth(mi)}
                    className={cn(
                      'rounded-xl py-2.5 text-sm font-semibold transition-colors duration-100',
                      isSelectedMonth
                        ? 'bg-accent text-accent-foreground'
                        : isCurrentView
                          ? 'border border-accent/40 text-accent/80'
                          : 'text-foreground/65 hover:bg-white/[0.06] hover:text-foreground/90',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors duration-100 hover:bg-white/[0.06] hover:text-foreground/70"
    >
      {children}
    </button>
  )
}

function SingleChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      {dir === 'left'
        ? <path d="M7.5 2L4.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M4.5 2L7.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      }
    </svg>
  )
}

function DoubleChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      {dir === 'left' ? (
        <>
          <path d="M8 2L5 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 2L2 6L5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M6 2L9 6L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 2L12 6L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DatePickerDayButton({ className, day: _day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
  const isToday = modifiers.today
  const isOutside = modifiers.outside

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex aspect-square w-full min-w-[36px] items-center justify-center rounded-lg text-[13px] font-medium transition-colors duration-100',
        'text-foreground/65 hover:bg-white/[0.06] hover:text-foreground/90',
        isSelected && 'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground',
        isToday && !isSelected && 'ring-1 ring-accent/40 text-accent/80',
        isOutside && !isSelected && 'text-muted-foreground/22 hover:bg-transparent hover:text-muted-foreground/35',
        className,
      )}
      {...props}
    />
  )
}
