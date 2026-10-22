import { useEffect, useState, useCallback, useMemo } from 'react'

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '')

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const attendanceDotColor = {
  present: 'bg-emerald-500',
  absent: 'bg-rose-500',
  'on-leave': 'bg-violet-500',
  weekend: 'bg-slate-300',
}

function useApi(path, { transform } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json = await res.json()
      const unwrappedData = json.data !== undefined ? json.data : json;
      setData(transform ? transform(unwrappedData) : unwrappedData)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [path, transform])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

function CardShell({ title, action, children, loading, error, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>}
          {action}
        </div>
      )}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      ) : error ? (
        <p className="text-xs text-rose-500">Couldn't load this section. {error}</p>
      ) : (
        children
      )}
    </div>
  )
}

// Builds a Sun–Sat month grid. Cells outside the target month are `null`.
function buildMonthGrid(month, year) {
  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstOfMonth.getDay() // 0 = Sun

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Windows-calendar-style header: full date row + Month/Year with up/down nav
function WindowsCalendarHeader({ dateLabel, monthLabel, onPrev, onNext }) {
  return (
    <div className="bg-slate-50 rounded-lg -mx-1 -mt-1 mb-3">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
        <span className="text-sm font-semibold text-slate-700">{dateLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-bold text-slate-800">{monthLabel}</span>
        <div className="flex flex-col -gap-1">
          <button onClick={onPrev} aria-label="Previous month" className="text-slate-400 hover:text-indigo-600 leading-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8l6 8H6z" /></svg>
          </button>
          <button onClick={onNext} aria-label="Next month" className="text-slate-400 hover:text-indigo-600 leading-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-6-8h12z" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeDashboard() {
  const today = useMemo(() => new Date(), [])

  // Today's attendance, department
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useApi('/attendance/dashboard/stats')

  // Monthly attendance data is also needed for the calendar
  // Its refetch is handled inside its own useApi call below.

  // Auto-refresh today's attendance when the employee switches back to this tab.
  // This ensures that if admin uploaded an Excel or changed status while the
  // employee had the dashboard open, the status updates without a full page reload.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        refetchStats()
      }
    }
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', refetchStats)
    return () => {
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', refetchStats)
    }
  }, [refetchStats])

  // Attendance calendar month/year being viewed
  const [calDate, setCalDate] = useState({ month: today.getMonth() + 1, year: today.getFullYear() })

  const goPrevMonth = () =>
    setCalDate((prev) => {
      const d = new Date(prev.year, prev.month - 2, 1)
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    })
  const goNextMonth = () =>
    setCalDate((prev) => {
      const d = new Date(prev.year, prev.month, 1)
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    })

  // Holidays calendar month/year being viewed
  const [holidayCalDate, setHolidayCalDate] = useState({ month: today.getMonth() + 1, year: today.getFullYear() })

  const goPrevHolidaysMonth = () =>
    setHolidayCalDate((prev) => {
      const d = new Date(prev.year, prev.month - 2, 1)
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    })
  const goNextHolidaysMonth = () =>
    setHolidayCalDate((prev) => {
      const d = new Date(prev.year, prev.month, 1)
      return { month: d.getMonth() + 1, year: d.getFullYear() }
    })

  // No static fallback — all attendance data comes from the real API.
  // Dates with no record in the database will simply show no dot.

  // Latest announcement
  const { data: announcement, loading: announcementLoading, error: announcementError } = useApi(
    '/employee/announcements/latest'
  )

  // Leave balance
  const { data: leaveBalances, loading: leaveLoading, error: leaveError } = useApi('/employee/leave-balance')

  // Office holidays — admin-managed, fetched as a flat list and derived client-side
  const calendarMonth = holidayCalDate.month
  const calendarYear = holidayCalDate.year
  const {
    data: holidaysRaw,
    loading: holidaysLoading,
    error: holidaysError,
  } = useApi('/holidays')

  const attendanceWeeks = useMemo(() => buildMonthGrid(calDate.month, calDate.year), [calDate])
  const attendanceMonthLabel = new Date(calDate.year, calDate.month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Monthly attendance data from PostgreSQL API
  const { data: monthAttendanceData } = useApi(
    `/employee/attendance/month?month=${calDate.month}&year=${calDate.year}`
  )

  // Map day-of-month -> status
  // Build day-number -> status map from real API data only.
  // If monthAttendanceData is null/empty (API still loading or no records yet),
  // return an empty map so no fake dots appear on the calendar.
  const attendanceByDay = useMemo(() => {
    const map = new Map()
    if (Array.isArray(monthAttendanceData)) {
      monthAttendanceData.forEach((item) => {
        if (item.date && item.status) {
          const dayNum = parseInt(item.date.split('-')[2], 10)
          map.set(dayNum, item.status)
        }
      })
    }
    return map
  }, [monthAttendanceData])

  const monthCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, 'on-leave': 0 }
    attendanceByDay.forEach((status) => {
      if (counts[status] !== undefined) counts[status] += 1
    })
    return counts
  }, [attendanceByDay])

  // Normalize the holidays list (backend returns holidayName / holidayDate)
  const holidayList = Array.isArray(holidaysRaw) ? holidaysRaw : []
  const parsedHolidays = holidayList.map((h) => {
    const d = new Date(h.holidayDate)
    return {
      id: h.id,
      title: h.holidayName,
      description: h.description,
      dateObj: d,
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'long' }),
      year: d.getFullYear(),
      day: d.toLocaleDateString('en-US', { weekday: 'long' }),
    }
  })

  const monthHolidays = parsedHolidays.filter(
    (h) => h.dateObj.getMonth() + 1 === calendarMonth && h.dateObj.getFullYear() === calendarYear
  )
  const upcomingHolidays = parsedHolidays
    .filter((h) => h.dateObj >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 4)

  const holidayDatesInMonth = new Set(monthHolidays.map((h) => h.date))
  const holidayWeeks = useMemo(() => buildMonthGrid(calendarMonth, calendarYear), [calendarMonth, calendarYear])
  const holidayMonthLabel = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Good Morning{stats?.employeeName ? `, ${stats.employeeName}` : ''}! 👋
          </h2>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your work today.</p>
        </div>
        <p className="text-sm font-medium text-slate-600">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Main + right sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left/main column */}
        <div className="lg:col-span-3 space-y-5">
          {/* Stat cards — Today's Attendance + My Department only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-3">
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">Today's Attendance</p>
                {statsLoading ? (
                  <div className="animate-pulse h-4 w-16 bg-slate-100 rounded mt-1" />
                ) : statsError ? (
                  <p className="text-xs text-rose-500">--</p>
                ) : (
                  <>
                    <p
                      className={`text-lg font-bold ${stats?.todayStatus === 'Present'
                        ? 'text-emerald-600'
                        : stats?.todayStatus === 'Absent'
                          ? 'text-rose-500'
                          : 'text-violet-600'
                        }`}
                    >
                      {stats?.todayStatus || '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stats?.checkInTime ? `Checked in at ${stats.checkInTime}` : 'Not checked in yet'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 7 9 18l-5-5" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">My Department</p>
                {statsLoading ? (
                  <div className="animate-pulse h-4 w-20 bg-slate-100 rounded mt-1" />
                ) : statsError ? (
                  <p className="text-xs text-rose-500">--</p>
                ) : (
                  <>
                    <p className="text-lg font-bold text-slate-900">{stats?.department || '—'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stats?.teamSize ? `Team of ${stats.teamSize}` : ''}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Attendance Overview — Windows-calendar-style widget (static demo data) */}
          <CardShell title="Attendance Overview">
            <WindowsCalendarHeader
              dateLabel={today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              monthLabel={attendanceMonthLabel}
              onPrev={goPrevMonth}
              onNext={goNextMonth}
            />

            <div className="flex flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700">{monthCounts.present}</span> Present
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="font-semibold text-slate-700">{monthCounts.absent}</span> Absent
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span className="font-semibold text-slate-700">{monthCounts['on-leave']}</span> Leave
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
              {weekdayLabels.map((w, i) => (
                <span key={i} className="text-[10px] font-semibold text-slate-500">
                  {w}
                </span>
              ))}
            </div>

            <div className="space-y-0.5">
              {attendanceWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-0.5">
                  {week.map((d, di) => {
                    if (!d) return <div key={di} className="h-9" />
                    const isToday = isSameDay(d, today)
                    const isWeekend = di === 0 || di === 6
                    const status = attendanceByDay.get(d.getDate())
                    return (
                      <div key={di} className="h-9 flex flex-col items-center justify-center gap-0.5">
                        <span
                          className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px]
                            ${isToday ? 'bg-indigo-600 text-white font-bold' : isWeekend ? 'text-slate-400' : 'text-slate-700'}
                          `}
                        >
                          {d.getDate()}
                        </span>
                        <span className={`w-1 h-1 rounded-full ${status ? attendanceDotColor[status] : 'bg-transparent'}`} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2.5 pt-3 mt-3 border-t border-slate-100">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Absent
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> On Leave
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Weekend
              </span>
            </div>
          </CardShell>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Announcement */}
          <CardShell title="Latest Announcement" loading={announcementLoading} error={announcementError}>
            {announcement ? (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 11v3a1 1 0 0 0 1 1h1l3 5V5L5 10H4a1 1 0 0 0-1 1Z" />
                      <path d="M13 7a3 3 0 0 1 0 10" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">{announcement.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{announcement.body}</p>
                </div>
                <button className="text-xs font-medium text-indigo-600 mt-3">View All Announcements</button>
              </>
            ) : (
              <p className="text-xs text-slate-400">No announcements right now.</p>
            )}
          </CardShell>

          {/* Leave Balance */}
          <CardShell
            title="Leave Balance"
            loading={leaveLoading}
            error={leaveError}
            action={
              <button className="text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50">
                View All
              </button>
            }
          >
            <div className="space-y-4">
              {(leaveBalances || []).map((l) => (
                <div key={l.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600">{l.label}</span>
                    <span className="font-semibold text-slate-800">
                      {l.used} / {l.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${l.color || 'bg-indigo-500'}`}
                      style={{ width: `${l.total ? (l.used / l.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardShell>

          {/* Office Holidays — same calendar visual language as Attendance Overview */}
          <CardShell
            title="Office Holidays"
            loading={holidaysLoading}
            error={holidaysError}
            action={
              <div className="flex items-center gap-2">
                <button onClick={goPrevHolidaysMonth} className="text-slate-400 hover:text-indigo-600 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-xs font-medium text-slate-500 w-[80px] text-center">{holidayMonthLabel}</span>
                <button onClick={goNextHolidaysMonth} className="text-slate-400 hover:text-indigo-600 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            }
          >
            {/* Calendar */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {weekdayLabels.map((w, i) => (
                <span key={i} className="text-[10px] font-medium text-slate-400">
                  {w}
                </span>
              ))}
            </div>
            <div className="space-y-1 mb-4">
              {holidayWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((d, di) => {
                    if (!d) return <div key={di} className="aspect-square" />
                    const isToday = isSameDay(d, today)
                    const isWeekend = di === 0 || di === 6
                    const isHoliday = holidayDatesInMonth.has(d.getDate())
                    return (
                      <div
                        key={di}
                        className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium
                          ${isHoliday ? 'bg-rose-50 text-rose-600 font-bold' : isWeekend ? 'bg-slate-50 text-slate-400' : 'text-slate-700'}
                        `}
                      >
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white font-bold' : ''
                            }`}
                        >
                          {d.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pb-3 mb-3 border-b border-slate-100">
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Holiday
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-300" /> Weekend
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Working Day
              </span>
            </div>

            {/* Upcoming holidays list */}
            <div className="space-y-3">
              {upcomingHolidays.length > 0 ? (
                upcomingHolidays.map((h) => (
                  <div key={h.id || h.title} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-semibold text-rose-500">
                        {h.month.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{h.date}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{h.title}</p>
                      <p className="text-xs text-slate-400">
                        {h.day}, {h.year}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No upcoming holidays.</p>
              )}
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  )
}
