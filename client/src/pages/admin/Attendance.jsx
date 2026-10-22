import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import * as XLSX from 'xlsx'

const locations = ['All Locations', 'Head Office', 'Remote', 'Branch Office']
const statuses = ['All Statuses', 'Present', 'Absent', 'On Leave']

const statusStyles = {
    Present: 'bg-emerald-50 text-emerald-600',
    Absent: 'bg-rose-50 text-rose-500',
    'On Leave': 'bg-violet-50 text-violet-600',
}

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const formatDate = (dateString) => {
    const d = new Date(dateString)
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset())
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getToday = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

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

export default function Attendance() {
    const [dept, setDept] = useState('All Departments')
    const [status, setStatus] = useState('All Statuses')
    const [location, setLocation] = useState('All Locations')
    const [search, setSearch] = useState('')
    const [selectedDate, setSelectedDate] = useState(
        // Persist last-selected date in localStorage so navigating away and back
        // does NOT reset to today — imported Excel data stays visible.
        () => localStorage.getItem('ems_attendance_date') || getToday()
    )
    const [attendanceRecords, setAttendanceRecords] = useState([])
    const [stats, setStats] = useState({ totalEmployees: 0, present: 0, absent: 0, onLeave: 0 })
    const [loading, setLoading] = useState(true)
    const [actionLoadingId, setActionLoadingId] = useState(null)
    const [message, setMessage] = useState(null)
    const [departmentsList, setDepartmentsList] = useState([])

    const fileInputRef = useRef(null)

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await api.get('/departments')
                setDepartmentsList(res.data.data || [])
            } catch (err) {
                console.error("Fetch departments error:", err)
            }
        }
        fetchDepts()
    }, [])

    const today = useMemo(() => new Date(), [])
    const [holidayCalDate, setHolidayCalDate] = useState({ month: today.getMonth() + 1, year: today.getFullYear() })
    const [holidaysRaw, setHolidaysRaw] = useState([])
    const [holidaysLoading, setHolidaysLoading] = useState(true)

    const fetchHolidays = useCallback(async () => {
        setHolidaysLoading(true)
        try {
            const res = await api.get('/holidays')
            setHolidaysRaw(res.data.data !== undefined ? res.data.data : res.data || [])
        } catch (err) {
            console.error("Fetch holidays error:", err)
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

    const parsedHolidays = useMemo(() => {
        const list = Array.isArray(holidaysRaw) ? holidaysRaw : []
        return list.map((h) => {
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
    }, [holidaysRaw])

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

    const fetchAttendanceData = useCallback(async () => {
        setLoading(true)
        try {
            const [recordsRes, statsRes] = await Promise.all([
                api.get(`/attendance?date=${selectedDate}`),
                api.get(`/attendance/stats?date=${selectedDate}`),
            ])
            setAttendanceRecords(recordsRes.data.data || [])
            setStats(statsRes.data.data || { totalEmployees: 0, present: 0, absent: 0, onLeave: 0 })
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [selectedDate])

    useEffect(() => {
        fetchAttendanceData()
    }, [fetchAttendanceData])

    // Persist the selected date so navigating away and back keeps the same date.
    // This prevents uploaded Excel data from appearing to "disappear".
    useEffect(() => {
        localStorage.setItem('ems_attendance_date', selectedDate)
    }, [selectedDate])

    // Auto-dismiss the import success/error banner after 10 seconds.
    // The DB data is NOT affected — only the notification is cleared.
    useEffect(() => {
        if (!message) return
        const t = setTimeout(() => setMessage(null), 10000)
        return () => clearTimeout(t)
    }, [message])

    const filtered = useMemo(() => {
        return attendanceRecords.filter((record) => {
            const matchesDept = dept === 'All Departments' || record.department_name === dept
            const matchesLocation = location === 'All Locations' || record.location === location
            const matchesStatus = status === 'All Statuses' || record.status === status
            const fullName = `${record.first_name} ${record.last_name || ''}`.toLowerCase()
            const matchesSearch = fullName.includes(search.toLowerCase())
            return matchesDept && matchesLocation && matchesStatus && matchesSearch
        })
    }, [attendanceRecords, dept, location, status, search])

    const handleMarkPresent = async (employeeId) => {
        setActionLoadingId(employeeId)
        try {
            await api.post('/attendance/mark-present', { employeeId, date: selectedDate })
            await fetchAttendanceData()
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleMarkAbsent = async (employeeId) => {
        setActionLoadingId(employeeId)
        try {
            await api.post('/attendance/mark-absent', { employeeId, date: selectedDate })
            await fetchAttendanceData()
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }

    const parseExcelDate = (val) => {
        if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }
        if (typeof val === 'string') {
            const clean = val.trim()
            if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
            const parsed = new Date(clean)
            if (!isNaN(parsed.getTime())) {
                const year = parsed.getFullYear()
                const month = String(parsed.getMonth() + 1).padStart(2, '0')
                const day = String(parsed.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
            }
        }
        return val
    }

    const parseExcelTime = (val) => {
        if (typeof val === 'number') {
            const totalSeconds = Math.round(val * 86400)
            const hours = Math.floor(totalSeconds / 3600)
            const minutes = Math.floor((totalSeconds % 3600) / 60)
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        }
        if (typeof val === 'string') {
            const clean = val.trim()
            const match = clean.match(/^(\d{1,2}):(\d{2})/)
            if (match) {
                return `${match[1].padStart(2, '0')}:${match[2]}`
            }
        }
        return val
    }

    const handleFileImport = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result
                const workbook = XLSX.read(bstr, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const rawRows = XLSX.utils.sheet_to_json(sheet)
                
                const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || []
                const normalizedHeaders = headers.map(h => String(h).trim())
                
                const hasDate = normalizedHeaders.some(h => ['date', 'Date'].includes(h))
                const hasIdentifier = normalizedHeaders.some(h => ['name', 'Name', 'employee id', 'Employee ID', 'employee_id', 'employee name', 'Employee Name'].includes(h))
                
                if (!hasDate || !hasIdentifier) {
                    setMessage({ type: 'error', text: 'Invalid file format. Columns must contain Date and an identifier (Name or Employee ID).' })
                    return
                }

                const records = rawRows.map(row => {
                    const nameKey = Object.keys(row).find(k => ['name', 'Name', 'employee name', 'Employee Name'].includes(k.trim()))
                    const idKey = Object.keys(row).find(k => ['employee id', 'Employee ID', 'employee_id'].includes(k.trim()))
                    const dateKey = Object.keys(row).find(k => ['date', 'Date'].includes(k.trim()))
                    const timingKey = Object.keys(row).find(k => ['timing', 'Timing', 'check-in time', 'Check-in Time', 'checkIn'].includes(k.trim()))
                    const statusKey = Object.keys(row).find(k => ['status', 'Status'].includes(k.trim()))

                    return {
                        name: nameKey ? row[nameKey] : undefined,
                        employee_id: idKey ? row[idKey] : undefined,
                        date: dateKey ? parseExcelDate(row[dateKey]) : undefined,
                        timing: timingKey ? parseExcelTime(row[timingKey]) : undefined,
                        status: statusKey ? row[statusKey] : undefined
                    }
                })

                const res = await api.post('/attendance/import', { records })
                
                if (records.length > 0 && records[0].date) {
                    setSelectedDate(records[0].date)
                }
                await fetchAttendanceData()

                const importedCount = res.data.importedCount
                const failedCount = res.data.failedRecords ? res.data.failedRecords.length : 0
                
                if (failedCount > 0) {
                    setMessage({
                        type: 'success',
                        text: `Successfully imported and verified ${importedCount} records. ${failedCount} records failed (unmatched names/IDs or invalid format).`
                    })
                } else {
                    setMessage({
                        type: 'success',
                        text: `Successfully imported and verified all ${importedCount} records!`
                    })
                }
            } catch (err) {
                console.error("Import error:", err)
                setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to parse/import Excel file.' })
            } finally {
                e.target.value = ''
            }
        }
        reader.readAsBinaryString(file)
    }

    const handleExportReport = () => {
        try {
            const exportData = filtered.map(r => ({
                'Employee Name': `${r.first_name} ${r.last_name || ''}`.trim(),
                'Department': r.department_name || '-',
                'Date': selectedDate,
                'Check In': r.check_in || '-',
                'Check Out': r.check_out || '-',
                'Status': r.status || 'Absent',
                'Working Hours': r.working_hours || '-'
            }))

            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
            
            const fileName = `Attendance_Report_${selectedDate}.xlsx`
            XLSX.writeFile(workbook, fileName)
        } catch (err) {
            console.error("Export error:", err)
            setMessage({ type: 'error', text: 'Failed to export report: ' + err.message })
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage employee attendance and monthly fingerprint records</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50"
                    >
                        Import Attendance
                    </button>
                    <button
                        onClick={handleExportReport}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
                    >
                        Export Report
                    </button>
                </div>
            </div>

            {/* Alert Message Box */}
            {message && (
                <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    <div className="flex items-center gap-3">
                        {message.type === 'success' ? (
                            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Total Employees</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEmployees}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Present</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.present}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Absent</p>
                    <p className="text-2xl font-bold text-rose-500 mt-1">{stats.absent}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">On Leave</p>
                    <p className="text-2xl font-bold text-violet-600 mt-1">{stats.onLeave}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select value={dept} onChange={(e) => setDept(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="All Departments">All Departments</option>
                            {departmentsList.map((d) => (
                                <option key={d.id} value={d.department_name}>{d.department_name}</option>
                            ))}
                        </select>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            {statuses.map((s) => (<option key={s}>{s}</option>))}
                        </select>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search employee..."
                            className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                    <th className="pb-3 font-medium">Employee</th>
                                    <th className="pb-3 font-medium">Department</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium text-center">Status</th>
                                    <th className="pb-3 font-medium text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="py-8 text-center text-slate-500">Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="5" className="py-8 text-center text-slate-400">No records found</td></tr>
                                ) : (
                                    filtered.map((e) => (
                                        <tr key={e.employee_id} className="border-b border-slate-50">
                                            <td className="py-3 font-medium text-slate-900">{e.first_name} {e.last_name}</td>
                                            <td className="py-3 text-slate-600">{e.department_name || '-'}</td>
                                            <td className="py-3 text-slate-600">{formatDate(selectedDate)}</td>
                                            <td className="py-3 text-center">
                                                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[e.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {e.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    {e.status === 'Absent' ? (
                                                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3.5 py-1.5">
                                                            Marked Absent
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleMarkAbsent(e.employee_id)}
                                                            disabled={actionLoadingId === e.employee_id || e.status === 'On Leave'}
                                                            className="text-xs font-medium text-rose-500 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 disabled:opacity-50"
                                                        >
                                                            Mark Absent
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    {/* Office Holidays Calendar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900 text-sm">Office Holidays</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={goPrevHolidaysMonth} className="text-slate-400 hover:text-indigo-600 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                                </button>
                                <span className="text-xs font-medium text-slate-500 w-[80px] text-center">{holidayMonthLabel}</span>
                                <button onClick={goNextHolidaysMonth} className="text-slate-400 hover:text-indigo-600 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>

                        {holidaysLoading ? (
                            <div className="animate-pulse space-y-3 py-4">
                                <div className="h-3 bg-slate-100 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                            </div>
                        ) : (
                            <>
                                {/* Calendar Grid */}
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

                                {/* Upcoming Holidays List */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-slate-700">Upcoming Holidays</h4>
                                    {upcomingHolidays.length > 0 ? (
                                        upcomingHolidays.map((h) => (
                                            <div key={h.id || h.title} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[9px] font-semibold text-rose-500">
                                                        {h.month.slice(0, 3).toUpperCase()}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800">{h.date}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-800 truncate">{h.title}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {h.day}, {h.year}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400">No upcoming holidays.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-4">Monthly Summary</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Present', value: stats.present },
                                        { name: 'Absent', value: stats.absent },
                                        { name: 'On Leave', value: stats.onLeave }
                                    ]} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                                        <Cell fill="#10B981" />
                                        <Cell fill="#F43F5E" />
                                        <Cell fill="#8B5CF6" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold mt-4">
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present ({stats.present})
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent ({stats.absent})
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> On Leave ({stats.onLeave})
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
