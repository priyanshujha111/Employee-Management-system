import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../services/api'

const statusStyles = {
    Present: 'bg-emerald-50 text-emerald-600',
    Late: 'bg-amber-50 text-amber-600',
    Absent: 'bg-rose-50 text-rose-500',
    'On Leave': 'bg-violet-50 text-violet-600',
    'Weekly Off': 'bg-slate-100 text-slate-500',
}

const dotColor = {
    present: 'bg-emerald-500',
    absent: 'bg-rose-500',
    late: 'bg-amber-500',
    'on-leave': 'bg-violet-500',
    'on leave': 'bg-violet-500',
    weekend: 'bg-slate-300',
}

// Build a Sun–Sat grid of Date objects (null for padding cells)
function buildMonthGrid(month, year) {
    const firstOfMonth = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    const startWeekday = firstOfMonth.getDay() // 0 = Sun
    const cells = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return weeks
}


const PAGE_SIZE = 10

// "09:02" -> "09:02 AM"
const formatTime = (hhmm) => {
    if (!hhmm) return '-'
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// "2025-05-21" -> { date: "May 21, 2025", day: "Wed" }
const formatDate = (isoDate) => {
    if (!isoDate) return { date: '-', day: '-' }
    const d = new Date(`${String(isoDate).split('T')[0]}T00:00:00`)
    return {
        date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    }
}

// Map a raw backend attendance row to the shape the table renders
const mapRecord = (row) => {
    const { date, day } = formatDate(row.date)
    return {
        date,
        day,
        checkIn: formatTime(row.check_in),
        checkOut: formatTime(row.check_out),
        hours: row.working_hours || '-',
        status: row.status || '-',
        remarks: row.remarks || '-',
    }
}

export default function EmployeeAttendance() {
    const [activeTab, setActiveTab] = useState('records')
    const [page, setPage] = useState(1)

    const [todayAttendance, setTodayAttendance] = useState(null)
    const [attendanceRecords, setAttendanceRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState('')

    // ── Data loading ──────────────────────────────────────────────
    const fetchToday = useCallback(async () => {
        const res = await api.get('/attendance/my-today')
        setTodayAttendance(res.data?.data || null)
    }, [])

    const fetchRecords = useCallback(async () => {
        const res = await api.get('/attendance/my-records')
        setAttendanceRecords(res.data?.data || [])
    }, [])

    const loadAll = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            await Promise.all([fetchToday(), fetchRecords()])
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load attendance data.')
        } finally {
            setLoading(false)
        }
    }, [fetchToday, fetchRecords])

    useEffect(() => { loadAll() }, [loadAll])

    // ── Check in / Check out ─────────────────────────────────────
    const refreshAfterAction = async () => {
        try {
            await Promise.all([fetchToday(), fetchRecords()])
        } catch {
            // Non-fatal — the action itself already succeeded; the next
            // manual refresh or page load will pick up the latest state.
        }
    }

    const handleCheckIn = async () => {
        setActionLoading(true)
        setActionError('')
        try {
            await api.post('/attendance/checkin', {})
            await refreshAfterAction()
        } catch (err) {
            setActionError(err.response?.data?.message || 'Check-in failed. Please try again.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleCheckOut = async () => {
        setActionLoading(true)
        setActionError('')
        try {
            await api.post('/attendance/checkout', {})
            await refreshAfterAction()
        } catch (err) {
            setActionError(err.response?.data?.message || 'Check-out failed. Please try again.')
        } finally {
            setActionLoading(false)
        }
    }

    // ── Derived stats (computed from real fetched records) ────────
    const presentDays = attendanceRecords.filter(r => r.status === 'Present').length
    const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length
    const lateDays = attendanceRecords.filter(r => r.status === 'Late').length
    const onLeave = attendanceRecords.filter(r => r.status === 'On Leave').length
    const totalWorkingDays = presentDays + absentDays + lateDays + onLeave

    const pct = (n) => totalWorkingDays > 0 ? `${((n / totalWorkingDays) * 100).toFixed(2)}%` : '0.00%'

    const stats = [
        { label: 'Present Days', value: presentDays, pct: pct(presentDays), bg: 'bg-emerald-50', fg: 'text-emerald-600', icon: 'check' },
        { label: 'Absent Days', value: absentDays, pct: pct(absentDays), bg: 'bg-rose-50', fg: 'text-rose-500', icon: 'x' },
        { label: 'Late Days', value: lateDays, pct: pct(lateDays), bg: 'bg-violet-50', fg: 'text-violet-600', icon: 'clock' },
        { label: 'On Leave', value: onLeave, pct: pct(onLeave), bg: 'bg-amber-50', fg: 'text-amber-500', icon: 'leave' },
    ]

    // ── Table rows + client-side pagination ────────────────────────
    const mappedRecords = attendanceRecords.map(mapRecord)
    const totalPages = Math.max(1, Math.ceil(mappedRecords.length / PAGE_SIZE))
    const pageRecords = mappedRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const rangeStart = mappedRecords.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const rangeEnd = Math.min(page * PAGE_SIZE, mappedRecords.length)

    // ── Calendar: dynamic month/year with real API data ──────────
    const todayObj = useMemo(() => new Date(), [])
    const [calMonth, setCalMonth] = useState(todayObj.getMonth() + 1)
    const [calYear, setCalYear] = useState(todayObj.getFullYear())
    const [calendarData, setCalendarData] = useState([]) // { date: 'YYYY-MM-DD', status: string }[]
    const [calLoading, setCalLoading] = useState(false)

    const fetchCalendar = useCallback(async (month, year) => {
        setCalLoading(true)
        try {
            const res = await api.get(`/attendance/month?month=${month}&year=${year}`)
            setCalendarData(res.data?.data || [])
        } catch {
            setCalendarData([])
        } finally {
            setCalLoading(false)
        }
    }, [])

    useEffect(() => { fetchCalendar(calMonth, calYear) }, [fetchCalendar, calMonth, calYear])

    const calPrev = () => {
        const d = new Date(calYear, calMonth - 2, 1)
        setCalMonth(d.getMonth() + 1)
        setCalYear(d.getFullYear())
    }
    const calNext = () => {
        const d = new Date(calYear, calMonth, 1)
        setCalMonth(d.getMonth() + 1)
        setCalYear(d.getFullYear())
    }

    // Build day-number -> status map from real data
    const calDayStatus = useMemo(() => {
        const map = new Map()
        calendarData.forEach((item) => {
            if (item.date && item.status) {
                const day = parseInt(item.date.split('-')[2], 10)
                map.set(day, item.status)
            }
        })
        return map
    }, [calendarData])

    const calWeeks = useMemo(() => buildMonthGrid(calMonth, calYear), [calMonth, calYear])
    const calMonthLabel = new Date(calYear, calMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // ── Today's Attendance card state ──────────────────────────────
    const hasCheckedIn = !!todayAttendance?.check_in
    const hasCheckedOut = !!todayAttendance?.check_out
    const todayDisplay = formatDate(todayAttendance?.date || new Date().toISOString())

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Attendance</h2>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                        <span>Dashboard</span>
                        <span>&gt;</span>
                        <span className="text-slate-600">My Attendance</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="5" width="18" height="16" rx="2" />
                            <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                        <span>{todayDisplay.date}</span>
                    </div>
                    <button className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            {/* Load error banner */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={loadAll} className="font-semibold underline shrink-0">Retry</button>
                </div>
            )}

            {/* Today's Attendance card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 text-sm mb-4">Today's Attendance</h3>
                {loading ? (
                    <div className="py-6 text-center text-sm text-slate-400">Loading today's attendance…</div>
                ) : (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Date</p>
                                <p className="text-sm font-semibold text-slate-800">{todayDisplay.date}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Check In</p>
                                <p className={`text-sm font-semibold ${hasCheckedIn ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formatTime(todayAttendance?.check_in)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Check Out</p>
                                <p className={`text-sm font-semibold ${hasCheckedOut ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {formatTime(todayAttendance?.check_out)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Working Hours</p>
                                <p className="text-sm font-semibold text-slate-800">{todayAttendance?.working_hours || '-'}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                            {todayAttendance?.status && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[todayAttendance.status] || 'bg-slate-100 text-slate-500'}`}>
                                    {todayAttendance.status}
                                </span>
                            )}
                            {!hasCheckedIn && (
                                <button
                                    onClick={handleCheckIn}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
                                >
                                    {actionLoading ? 'Checking in…' : 'Check In'}
                                </button>
                            )}
                            {hasCheckedIn && !hasCheckedOut && (
                                <button
                                    onClick={handleCheckOut}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60"
                                >
                                    {actionLoading ? 'Checking out…' : 'Check Out'}
                                </button>
                            )}
                            {hasCheckedIn && hasCheckedOut && (
                                <button disabled className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">
                                    Attendance Completed
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {actionError && <p className="text-xs text-rose-600 mt-3">{actionError}</p>}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                        <div className={`w-11 h-11 rounded-lg ${s.bg} ${s.fg} flex items-center justify-center shrink-0`}>
                            {s.icon === 'check' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                    <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
                                </svg>
                            )}
                            {s.icon === 'x' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                    <path d="M3 10h18M8 3v4M16 3v4M9.5 14.5l5-5m0 5-5-5" />
                                </svg>
                            )}
                            {s.icon === 'clock' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 7v5l3 3" />
                                </svg>
                            )}
                            {s.icon === 'leave' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 12h20M12 2c2 3 3 7 3 10s-1 7-3 10c-2-3-3-7-3-10s1-7 3-10Z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-xl font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{s.pct}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Table side */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                    {/* Tabs */}
                    <div className="flex items-center gap-6 border-b border-slate-100 mb-4">
                        <button
                            onClick={() => setActiveTab('records')}
                            className={`pb-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'records' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                                }`}
                        >
                            Attendance Records
                        </button>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                                }`}
                        >
                            Monthly Overview
                        </button>
                    </div>

                    {activeTab === 'records' ? (
                        loading ? (
                            <div className="py-10 text-center text-sm text-slate-400">Loading attendance records…</div>
                        ) : mappedRecords.length === 0 ? (
                            <div className="py-10 text-center text-sm text-slate-400">No attendance records yet.</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-slate-500 border-b border-slate-100">
                                                <th className="pb-2 font-medium text-xs">Date</th>
                                                <th className="pb-2 font-medium text-xs">Day</th>
                                                <th className="pb-2 font-medium text-xs">Check In</th>
                                                <th className="pb-2 font-medium text-xs">Check Out</th>
                                                <th className="pb-2 font-medium text-xs">Working Hours</th>
                                                <th className="pb-2 font-medium text-xs">Status</th>
                                                <th className="pb-2 font-medium text-xs">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageRecords.map((r, i) => (
                                                <tr key={`${r.date}-${i}`} className="border-b border-slate-50 last:border-0">
                                                    <td className="py-3 text-slate-800 text-xs font-medium">{r.date}</td>
                                                    <td className="py-3 text-slate-500 text-xs">{r.day}</td>
                                                    <td className={`py-3 text-xs ${r.checkIn === '-' ? 'text-slate-400' : 'text-emerald-600 font-medium'}`}>
                                                        {r.checkIn}
                                                    </td>
                                                    <td className="py-3 text-slate-600 text-xs">{r.checkOut}</td>
                                                    <td className="py-3 text-slate-600 text-xs">{r.hours}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[r.status] || 'bg-slate-100 text-slate-500'}`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-slate-500 text-xs">{r.remarks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                        Showing {rangeStart} to {rangeEnd} of {mappedRecords.length} records
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            ‹
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => setPage(n)}
                                                className={`w-7 h-7 rounded-lg text-xs font-medium ${page === n ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        <div className="py-10 text-center text-sm text-slate-400">
                            Monthly overview chart coming soon.
                        </div>
                    )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    {/* Dynamic Attendance Calendar — reads from attendance table (same source as admin) */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-3">Attendance Calendar</h3>
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={calPrev}
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
                            >‹</button>
                            <span className="text-sm font-semibold text-slate-800">{calMonthLabel}</span>
                            <button
                                onClick={calNext}
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
                            >›</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                <span key={d} className="text-[10px] text-slate-400 font-medium">{d}</span>
                            ))}
                        </div>
                        {calLoading ? (
                            <div className="py-4 text-center text-xs text-slate-400">Loading…</div>
                        ) : (
                            calWeeks.map((week, wi) => (
                                <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                                    {week.map((dayNum, di) => {
                                        if (dayNum === null) return <div key={di} className="flex flex-col items-center gap-0.5 py-0.5" />
                                        const isWeekend = di === 0 || di === 6
                                        const isToday = dayNum === todayObj.getDate() && calMonth === todayObj.getMonth() + 1 && calYear === todayObj.getFullYear()
                                        // Status from real DB data; normalize 'on leave' -> 'on-leave'
                                        const rawStatus = calDayStatus.get(dayNum)
                                        const normalStatus = rawStatus === 'on leave' ? 'on-leave' : rawStatus
                                        const dotKey = isWeekend ? 'weekend' : (normalStatus || null)
                                        return (
                                            <div key={di} className="flex flex-col items-center gap-0.5 py-0.5">
                                                <span
                                                    className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                                                        isToday
                                                            ? 'bg-indigo-600 text-white font-semibold'
                                                            : isWeekend
                                                                ? 'text-slate-400'
                                                                : 'text-slate-700'
                                                    }`}
                                                >
                                                    {dayNum}
                                                </span>
                                                {dotKey && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor[dotKey] || 'bg-slate-200'}`} />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))
                        )}
                        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Late
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-violet-500" /> On Leave
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-slate-300" /> Weekend
                            </span>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Attendance Summary</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Total Working Days</span>
                                <span className="font-semibold text-slate-900">{totalWorkingDays}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Present Days</span>
                                <span className="font-semibold text-emerald-600">{presentDays} ({pct(presentDays)})</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Absent Days</span>
                                <span className="font-semibold text-rose-500">{absentDays} ({pct(absentDays)})</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Late Days</span>
                                <span className="font-semibold text-amber-500">{lateDays} ({pct(lateDays)})</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">On Leave</span>
                                <span className="font-semibold text-violet-600">{onLeave} ({pct(onLeave)})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 16v-4M12 8h.01" />
                </svg>
                <p className="text-xs text-blue-700">
                    <span className="font-semibold">Note:</span> Attendance data is updated in real-time. For any discrepancies, please contact your HR.
                </p>
            </div>
        </div>
    )
}
