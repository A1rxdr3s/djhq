'use client'

import * as React from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { DayButton, DayPicker } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
}

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

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
  const selected = parseDateValue(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onChange('')
                }
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
        className="w-auto p-0 bg-[#101010] border-white/[0.08] shadow-xl"
      >
        <DayPicker
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(day) => {
            onChange(day ? format(day, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          className="p-3"
          classNames={{
            root: 'w-fit',
            months: 'flex flex-col gap-4 relative',
            month: 'flex flex-col w-full gap-4',
            nav: 'flex items-center gap-1 w-full absolute -top-0 inset-x-0 justify-between',
            button_previous:
              'h-7 w-7 flex items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] text-muted-foreground/50 hover:bg-white/[0.06] hover:text-foreground/70 transition-colors',
            button_next:
              'h-7 w-7 flex items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] text-muted-foreground/50 hover:bg-white/[0.06] hover:text-foreground/70 transition-colors',
            month_caption: 'flex items-center justify-center h-7 w-full mb-1',
            caption_label: 'text-sm font-semibold text-foreground/70',
            table: 'w-full border-collapse',
            weekdays: 'flex',
            weekday:
              'text-muted-foreground/40 flex-1 font-normal text-[0.65rem] text-center pb-1 select-none uppercase tracking-widest',
            week: 'flex w-full mt-1',
            day: 'relative w-full h-full p-0 text-center aspect-square select-none',
            outside: 'opacity-30',
            disabled: 'opacity-20 cursor-not-allowed',
            hidden: 'invisible',
          }}
          components={{
            Chevron: ({ orientation }) => (
              <ChevronSmall dir={orientation === 'right' ? 'right' : 'left'} />
            ),
            DayButton: DatePickerDayButton,
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function ChevronSmall({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-70">
      {dir === 'left' ? (
        <path d="M7.5 2L4.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4.5 2L7.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

  const isSelected =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle
  const isToday = modifiers.today
  const isOutside = modifiers.outside

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex aspect-square w-full min-w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-100',
        'text-foreground/65 hover:bg-white/[0.06] hover:text-foreground/90',
        isSelected &&
          'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground',
        isToday && !isSelected && 'border border-accent/40 text-accent/80',
        isOutside &&
          'text-muted-foreground/25 hover:bg-transparent hover:text-muted-foreground/35',
        className,
      )}
      {...props}
    />
  )
}
