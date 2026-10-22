import { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import api from '../../services/api'

// Static config that never changes (colors per card slot, quick-action labels)
const statConfig = [
  { label: 'Total Employees', key: 'totalEmployees', color: 'bg-indigo-600' },
  { label: 'Departments', key: 'departments', color: 'bg-emerald-500' },
  { label: 'Designations', key: 'designations', color: 'bg-amber-500' },
  { label: 'Active Employees', key: 'activeEmployees', color: 'bg-violet-500' },
  { label: 'On Leave', key: 'onLeave', color: 'bg-rose-500' },
]

const quickActions = [
  { label: 'Add Employee', color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Mark Attendance', color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Apply Leave', color: 'bg-amber-50 text-amber-600' },
  { label: 'Run Payroll', color: 'bg-violet-50 text-violet-600' },
  { label: 'Add Announcement', color: 'bg-rose-50 text-rose-600' },
  { label: 'Generate Report', color: 'bg-sky-50 text-sky-600' },
  { label: 'Upload Document', color: 'bg-slate-100 text-slate-600' },
]

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function buildMonthGrid(month, year) {
  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstOfMonth.getDay()

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
        </div>
      ) : error ? (
        <div className="text-xs text-rose-500">{error}</div>
      ) : (
        children
      )}
    </div>
  )
}

// Fallback empty shapes so the render never crashes before data arrives
const EMPTY = {
  stats: { totalEmployees: 0, departments: 0, designations: 0, activeEmployees: 0, onLeave: 0 },
  overview: [],
  departmentDistribution: [],
  recentEmployees: [],
  birthdays: [],
  leaveSummary: { total: 0, approved: 0, pending: 0, rejected: 0 },
}

export default function AdminDashboard() {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard/admin')
        console.log('[AdminDashboard] API response:', res.data)
        if (res.data.success) {
          setData(res.data.data)
        } else {
          setError(res.data.message || 'Unexpected response from server')
        }
      } catch (err) {
        console.error('[AdminDashboard] fetch error:', err)
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  // Today's date — dynamic
  const today = useMemo(() => new Date(), [])
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' })

  // Holidays calendar state
  const [holidayCalDate, setHolidayCalDate] = useState({ month: today.getMonth() + 1, year: today.getFullYear() })
  const [holidaysRaw, setHolidaysRaw] = useState([])
  const [holidaysLoading, setHolidaysLoading] = useState(true)
  const [holidaysError, setHolidaysError] = useState(null)

  const fetchHolidays = useCallback(async () => {
    setHolidaysLoading(true)
    setHolidaysError(null)
    try {
      const res = await api.get('/holidays')
      setHolidaysRaw(res.data.data !== undefined ? res.data.data : res.data || [])
    } catch (err) {
      console.error("Fetch holidays error:", err)
      setHolidaysError(err.response?.data?.message || err.message || 'Failed to load holidays')
    } finally {
      setHolidaysLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

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

  const calendarMonth = holidayCalDate.month
  const calendarYear = holidayCalDate.year

  const holidayList = Array.isArray(holidaysRaw) ? holidaysRaw : []
  const parsedHolidays = useMemo(() => {
    return holidayList.map((h) => {
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
  }, [holidayList])

  const monthHolidays = useMemo(() => {
    return parsedHolidays.filter(
      (h) => h.dateObj.getMonth() + 1 === calendarMonth && h.dateObj.getFullYear() === calendarYear
    )
  }, [parsedHolidays, calendarMonth, calendarYear])

  const upcomingHolidays = useMemo(() => {
    return parsedHolidays
      .filter((h) => h.dateObj >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      .sort((a, b) => a.dateObj - b.dateObj)
      .slice(0, 4)
  }, [parsedHolidays, today])

  const holidayDatesInMonth = useMemo(() => new Set(monthHolidays.map((h) => h.date)), [monthHolidays])
  const holidayWeeks = useMemo(() => buildMonthGrid(calendarMonth, calendarYear), [calendarMonth, calendarYear])
  const holidayMonthLabel = useMemo(() => new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }), [calendarYear, calendarMonth])

  const totalDept = data.departmentDistribution.reduce((s, d) => s + d.value, 0)

  const leaveSummaryRows = [
    { label: 'Total Leaves', value: data.leaveSummary.total, color: 'text-slate-900' },
    { label: 'Approved Leaves', value: data.leaveSummary.approved, color: 'text-emerald-600' },
    { label: 'Pending Leaves', value: data.leaveSummary.pending, color: 'text-amber-500' },
    { label: 'Rejected Leaves', value: data.leaveSummary.rejected, color: 'text-rose-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-500 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Welcome back, Admin! 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening in your organization today.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold text-slate-800 leading-tight">{dateStr}</p>
            <p className="text-slate-400 text-xs">{dayStr}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statConfig.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center text-white`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.stats[s.key] ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Employees Overview</h3>
            <select className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600">
              <option>This Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.overview}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="employees" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3, fill: '#4F46E5' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Employees by Department</h3>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data.departmentDistribution}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {data.departmentDistribution.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-xl font-bold text-slate-900">{totalDept}</p>
              <p className="text-[10px] text-slate-400">Total</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.departmentDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="text-slate-400">
                  {d.value} ({totalDept > 0 ? Math.round((d.value / totalDept) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table + sidebar widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Recent Employees</h3>
            <a href="#" className="text-xs text-indigo-600 font-medium hover:text-indigo-700">View all employees</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium text-xs">Employee ID</th>
                  <th className="pb-2 font-medium text-xs">Name</th>
                  <th className="pb-2 font-medium text-xs">Department</th>
                  <th className="pb-2 font-medium text-xs">Designation</th>
                  <th className="pb-2 font-medium text-xs">Joining Date</th>
                  <th className="pb-2 font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 text-slate-700 text-xs">{emp.employee_id}</td>
                    <td className="py-2.5 text-slate-900 font-medium text-xs">{emp.name}</td>
                    <td className="py-2.5 text-slate-600 text-xs">{emp.department}</td>
                    <td className="py-2.5 text-slate-600 text-xs">{emp.designation}</td>
                    <td className="py-2.5 text-slate-600 text-xs">{emp.joined}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${emp.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-500'
                        }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recentEmployees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">No recent employees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">


          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Leave Summary</h3>
            <div className="space-y-2.5">
              {leaveSummaryRows.map((l) => (
                <div key={l.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{l.label}</span>
                  <span className={`font-semibold ${l.color}`}>{l.value}</span>
                </div>
              ))}
            </div>
            <a href="#" className="text-xs text-indigo-600 font-medium hover:text-indigo-700 block mt-3">Manage Leaves</a>
          </div>

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

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              <span className={`w-6 h-6 rounded-full ${a.color} flex items-center justify-center`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}