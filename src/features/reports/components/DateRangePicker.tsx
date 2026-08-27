import { useState } from 'react'

type DateRangePreset = 'today' | 'this-week' | 'this-month' | 'this-year' | 'last-week' | 'last-month'

interface DateRangePickerProps {
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void
}

function getDateRangeForPreset(preset: DateRangePreset): { from: string; to: string } {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  switch (preset) {
    case 'today': {
      const dateStr = today.toISOString().split('T')[0]
      return { from: dateStr, to: dateStr }
    }

    case 'this-week': {
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
      const monday = new Date(today.setDate(diff))
      const from = monday.toISOString().split('T')[0]
      const currentTo = new Date().toISOString().split('T')[0]
      return { from, to: currentTo }
    }

    case 'this-month': {
      const from = new Date(year, month, 1).toISOString().split('T')[0]
      const to = today.toISOString().split('T')[0]
      return { from, to }
    }

    case 'this-year': {
      const from = new Date(year, 0, 1).toISOString().split('T')[0]
      const to = today.toISOString().split('T')[0]
      return { from, to }
    }

    case 'last-week': {
      const currentDay = today.getDay()
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
      const thisMonday = new Date(today.getFullYear(), today.getMonth(), diff)
      const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastSunday = new Date(lastMonday.getTime() + 6 * 24 * 60 * 60 * 1000)
      const from = lastMonday.toISOString().split('T')[0]
      const to = lastSunday.toISOString().split('T')[0]
      return { from, to }
    }

    case 'last-month': {
      const lastMonthDate = new Date(year, month - 1, 1)
      const from = lastMonthDate.toISOString().split('T')[0]
      const to = new Date(year, month, 0).toISOString().split('T')[0]
      return { from, to }
    }

    default:
      return { from: '', to: '' }
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isDateInRange(date: Date, from: string, to: string): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return dateStr >= from && dateStr <= to
}

function isDateStart(_date: Date, from: string): boolean {
  return _date.toISOString().split('T')[0] === from
}

function isDateEnd(_date: Date, to: string): boolean {
  return _date.toISOString().split('T')[0] === to
}

function CalendarMonth({ year, month, dateFrom, dateTo, onDateClick }: { year: number; month: number; dateFrom: string; dateTo: string; onDateClick: (dateStr: string) => void }) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const days: (number | null)[] = []

  // Add empty days for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Pad weeks to always have 6 rows
  while (weeks.length < 6) {
    weeks.push(Array(7).fill(null))
  }

  return (
    <div className="min-w-64">
      <h3 className="mb-4 text-center text-sm font-semibold text-slate-900">
        {monthNames[month]} {year}
      </h3>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-600 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - 6 rows x 7 columns */}
      <div className="grid grid-cols-7 gap-1" style={{ gridAutoRows: 'minmax(2rem, 1fr)', height: '220px' }}>
        {weeks.map((week, weekIdx) =>
          week.map((day, dayIdx) => {
            if (day === null) {
              return <div key={`empty-${weekIdx}-${dayIdx}`} className="flex items-center justify-center" />
            }

            const date = new Date(year, month, day)
            const dateStr = date.toISOString().split('T')[0]
            const inRange = isDateInRange(date, dateFrom, dateTo)
            const isStart = isDateStart(date, dateFrom)
            const isEnd = isDateEnd(date, dateTo)

            return (
              <button
                key={`${day}`}
                onClick={() => onDateClick(dateStr)}
                type="button"
                className={`
                  flex items-center justify-center rounded text-xs font-medium cursor-pointer transition-colors
                  ${isStart && isEnd
                    ? 'bg-purple-600 text-white rounded-lg hover:bg-purple-700'
                    : isStart
                      ? 'bg-purple-600 text-white rounded-l-lg hover:bg-purple-700'
                      : isEnd
                        ? 'bg-purple-600 text-white rounded-r-lg hover:bg-purple-700'
                        : inRange
                          ? 'bg-purple-200 text-purple-900 hover:bg-purple-300'
                          : 'text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                {day}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

export function DateRangePicker({ dateFrom, dateTo, onDateChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const startDate = new Date(dateFrom)
  const [displayMonth, setDisplayMonth] = useState(startDate.getMonth())
  const [displayYear, setDisplayYear] = useState(startDate.getFullYear())
  const [tempFrom, setTempFrom] = useState(dateFrom)
  const [tempTo, setTempTo] = useState(dateTo)

  const handlePreset = (preset: DateRangePreset) => {
    const range = getDateRangeForPreset(preset)
    setTempFrom(range.from)
    setTempTo(range.to)
    onDateChange(range.from, range.to)
    setIsOpen(false)
  }

  const handleDateClick = (dateStr: string) => {
    // If no from date, set it
    if (!tempFrom) {
      setTempFrom(dateStr)
      return
    }

    // If from date is set but no to date, set it (or reset if clicking before from)
    if (!tempTo) {
      if (dateStr >= tempFrom) {
        setTempTo(dateStr)
        onDateChange(tempFrom, dateStr)
      } else {
        // User clicked before from date, swap them
        setTempFrom(dateStr)
        setTempTo(tempFrom)
        onDateChange(dateStr, tempFrom)
      }
      return
    }

    // If both are set, reset and start new selection
    setTempFrom(dateStr)
    setTempTo('')
  }

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11)
      setDisplayYear(displayYear - 1)
    } else {
      setDisplayMonth(displayMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0)
      setDisplayYear(displayYear + 1)
    } else {
      setDisplayMonth(displayMonth + 1)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!isOpen) {
            // Reset temp values when opening
            setTempFrom(dateFrom)
            setTempTo(dateTo)
          }
          setIsOpen(!isOpen)
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 hover:border-slate-400 focus:border-slate-500 focus:outline-none"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Date Range</p>
        <p className="font-medium">
          {tempFrom ? formatDate(new Date(tempFrom)) : 'Select start'} — {tempTo ? formatDate(new Date(tempTo)) : 'Select end'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Shortcuts */}
            <div className="flex flex-col gap-2 border-r border-slate-200 pr-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quick Select</p>
              {[
                { label: 'Today', value: 'today' as DateRangePreset },
                { label: 'This week', value: 'this-week' as DateRangePreset },
                { label: 'This month', value: 'this-month' as DateRangePreset },
                { label: 'This year', value: 'this-year' as DateRangePreset },
                { label: 'Last week', value: 'last-week' as DateRangePreset },
                { label: 'Last month', value: 'last-month' as DateRangePreset },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handlePreset(item.value)}
                  className="text-left text-sm font-medium text-slate-700 rounded px-2 py-1 hover:bg-slate-100"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Calendars */}
            <div className="col-span-3">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="rounded p-1 hover:bg-slate-100"
                  aria-label="Previous month"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="grid grid-cols-2 gap-8">
                  <CalendarMonth 
                    year={displayYear} 
                    month={displayMonth} 
                    dateFrom={tempFrom} 
                    dateTo={tempTo}
                    onDateClick={handleDateClick}
                  />
                  <CalendarMonth
                    year={displayMonth === 11 ? displayYear + 1 : displayYear}
                    month={(displayMonth + 1) % 12}
                    dateFrom={tempFrom}
                    dateTo={tempTo}
                    onDateClick={handleDateClick}
                  />
                </div>

                <button
                  onClick={handleNextMonth}
                  className="rounded p-1 hover:bg-slate-100"
                  aria-label="Next month"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Info and action buttons */}
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-600 text-center">
              {tempFrom && !tempTo ? (
                <>Click another date to complete the range</>
              ) : tempFrom && tempTo ? (
                <>Range selected: <strong>{formatDate(new Date(tempFrom))} — {formatDate(new Date(tempTo))}</strong></>
              ) : (
                <>Click a date to start selecting</>
              )}
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
