import { useState, useEffect, useContext } from 'react'
import Modal from '../../components/common/Modal'
import { AuthContext } from '../../context/AuthContext'
import api from '../../services/api'

const leaveTypeStyles = {
    'Casual Leave': { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    'Sick Leave': { bg: 'bg-blue-50', fg: 'text-blue-600' },
    'Earned Leave': { bg: 'bg-violet-50', fg: 'text-violet-600' },
    'Comp Off': { bg: 'bg-amber-50', fg: 'text-amber-600' },
    'Unpaid Leave': { bg: 'bg-rose-50', fg: 'text-rose-600' },
}

const statusStyles = {
    Approved: 'bg-emerald-50 text-emerald-600',
    Pending: 'bg-amber-50 text-amber-600',
    Rejected: 'bg-rose-50 text-rose-500',
}

const leavePolicy = [
    { label: 'Casual Leave', sub: 'Maximum 15 days per year', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    { label: 'Sick Leave', sub: 'Maximum 10 days per year', bg: 'bg-blue-50', fg: 'text-blue-600' },
    { label: 'Earned Leave', sub: 'Maximum 15 days per year', bg: 'bg-violet-50', fg: 'text-violet-600' },
    { label: 'Comp Off', sub: 'Maximum 5 days at a time', bg: 'bg-amber-50', fg: 'text-amber-600' },
]

const applySteps = [
    { step: 'Step 1', title: 'Click on Apply Leave', bg: 'bg-emerald-50', fg: 'text-emerald-600', icon: 'edit' },
    { step: 'Step 2', title: 'Select leave type and dates', bg: 'bg-blue-50', fg: 'text-blue-600', icon: 'calendar' },
    { step: 'Step 3', title: 'Add reason and submit request', bg: 'bg-violet-50', fg: 'text-violet-600', icon: 'doc' },
    { step: 'Step 4', title: 'Wait for approval from your manager', bg: 'bg-amber-50', fg: 'text-amber-600', icon: 'check' },
]

const tabs = ['Leave Requests', 'Leave History', 'Cancelled Leaves']

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const getDayOfWeek = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
};

export default function EmployeeLeave() {
    const { user } = useContext(AuthContext)
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('Leave Requests')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedLeave, setSelectedLeave] = useState(null)
    const [form, setForm] = useState({ type: 'Casual Leave', from: '', to: '', reason: '' })

    useEffect(() => {
        if (user?.employee_id) {
            fetchMyLeaves()
        }
    }, [user])

    const fetchMyLeaves = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/leaves/my/${user.employee_id}`)
            if (response.data?.success) {
                setRequests(response.data.data)
            }
        } catch (error) {
            console.error('Error fetching leaves:', error)
        } finally {
            setLoading(false)
        }
    }

    const filtered = requests.filter((r) => {
        if (activeTab === 'Cancelled Leaves') return r.status === 'Rejected'
        return true
    })

    const handleApply = async (e) => {
        e.preventDefault()
        const days =
            Math.round((new Date(form.to) - new Date(form.from)) / (1000 * 60 * 60 * 24)) + 1
        
        try {
            const payload = {
                employee_id: user?.employee_id,
                leave_type: form.type,
                from_date: form.from,
                to_date: form.to,
                total_days: isNaN(days) ? 1 : days,
                reason: form.reason,
            }
            const response = await api.post('/leaves', payload)
            if (response.data?.success) {
                fetchMyLeaves()
                setForm({ type: 'Casual Leave', from: '', to: '', reason: '' })
                setIsModalOpen(false)
            }
        } catch (error) {
            console.error('Error applying leave:', error)
            alert(error.response?.data?.message || 'Failed to submit leave request')
        }
    }

    const initialBalances = [
        { label: 'Casual Leave', total: 15, color: 'bg-emerald-500', icon: 'plane' },
        { label: 'Sick Leave', total: 10, color: 'bg-blue-500', icon: 'bed' },
        { label: 'Earned Leave', total: 15, color: 'bg-violet-500', icon: 'calendar' },
        { label: 'Comp Off', total: 5, color: 'bg-amber-500', icon: 'hourglass' },
    ]

    const leaveBalances = initialBalances.map((b) => {
        const used = requests
            .filter((r) => r.leave_type === b.label && r.status === 'Approved')
            .reduce((sum, r) => sum + Number(r.total_days || 0), 0)
        return { ...b, used }
    })

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Leave</h2>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                        <span>Dashboard</span>
                        <span>&gt;</span>
                        <span className="text-slate-600">My Leave</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Apply Leave
                </button>
            </div>

            {/* Leave balance stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {leaveBalances.map((l) => (
                    <div key={l.label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex gap-3 mb-3">
                            <div className={`w-11 h-11 rounded-lg ${l.color.replace('bg-', 'bg-').replace('500', '50')} flex items-center justify-center shrink-0`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={l.color.replace('bg-', 'text-')}>
                                    {l.icon === 'plane' && <path d="M2 12h20M12 2c2 3 3 7 3 10s-1 7-3 10c-2-3-3-7-3-10s1-7 3-10Z" />}
                                    {l.icon === 'bed' && (
                                        <>
                                            <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
                                            <path d="M3 18v2M21 18v2M3 12V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </>
                                    )}
                                    {l.icon === 'calendar' && (
                                        <>
                                            <rect x="3" y="5" width="18" height="16" rx="2" />
                                            <path d="M3 10h18M8 3v4M16 3v4" />
                                        </>
                                    )}
                                    {l.icon === 'hourglass' && (
                                        <>
                                            <path d="M5 2h14M5 22h14" />
                                            <path d="M6 2c0 5 5 6 5 10s-5 5-5 10M18 2c0 5-5 6-5 10s5 5 5 10" />
                                        </>
                                    )}
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">{l.label}</p>
                                <p className="text-xl font-bold text-slate-900">
                                    {l.used} <span className="text-sm font-medium text-slate-400">/ {l.total}</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">Available</p>
                            </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${l.color}`} style={{ width: `${Math.min(100, (l.used / l.total) * 100)}%` }} />
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
                        {tabs.map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={`pb-3 text-sm font-medium border-b-2 -mb-px ${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                    <th className="pb-2 font-medium text-xs">#</th>
                                    <th className="pb-2 font-medium text-xs">Leave Type</th>
                                    <th className="pb-2 font-medium text-xs">From</th>
                                    <th className="pb-2 font-medium text-xs">To</th>
                                    <th className="pb-2 font-medium text-xs">Total Days</th>
                                    <th className="pb-2 font-medium text-xs">Reason</th>
                                    <th className="pb-2 font-medium text-xs">Status</th>
                                    <th className="pb-2 font-medium text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const style = leaveTypeStyles[r.leave_type] || { bg: 'bg-slate-50', fg: 'text-slate-600' }
                                    const statusStyle = statusStyles[r.status] || 'bg-slate-50 text-slate-500'
                                    return (
                                        <tr key={r.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-3 text-slate-500 text-xs">{i + 1}</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-7 h-7 rounded-lg ${style.bg} ${style.fg} flex items-center justify-center shrink-0`}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M2 12h20M12 2c2 3 3 7 3 10s-1 7-3 10c-2-3-3-7-3-10s1-7 3-10Z" />
                                                        </svg>
                                                    </span>
                                                    <span className="text-slate-800 text-xs font-medium">{r.leave_type}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-slate-600 text-xs">
                                                {formatDate(r.from_date)} <span className="text-slate-400">({getDayOfWeek(r.from_date)})</span>
                                            </td>
                                            <td className="py-3 text-slate-600 text-xs">
                                                {formatDate(r.to_date)} <span className="text-slate-400">({getDayOfWeek(r.to_date)})</span>
                                            </td>
                                            <td className="py-3 text-slate-600 text-xs">{r.total_days} Day{Number(r.total_days) > 1 ? 's' : ''}</td>
                                            <td className="py-3 text-slate-600 text-xs truncate max-w-[150px]" title={r.reason}>{r.reason}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedLeave(r)
                                                        setIsViewModalOpen(true)
                                                    }}
                                                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {loading ? (
                            <p className="text-center text-slate-400 text-sm py-8">Loading leave requests...</p>
                        ) : filtered.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No records found.</p>
                        ) : null}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Showing 1 to {filtered.length} of {requests.length} requests</p>
                        <div className="flex items-center gap-1">
                            <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">‹</button>
                            <button className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-medium">1</button>
                            <button className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50">2</button>
                            <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">›</button>
                        </div>
                    </div>

                    {/* How to apply leave */}
                    <div className="mt-5 pt-5 border-t border-slate-100">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">How to Apply Leave</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {applySteps.map((s) => (
                                <div key={s.step} className="flex items-start gap-2.5">
                                    <span className={`w-9 h-9 rounded-lg ${s.bg} ${s.fg} flex items-center justify-center shrink-0`}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            {s.icon === 'edit' && <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />}
                                            {s.icon === 'calendar' && (
                                                <>
                                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                                    <path d="M3 10h18M8 3v4M16 3v4" />
                                                </>
                                            )}
                                            {s.icon === 'doc' && (
                                                <>
                                                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <path d="M14 3v5h5" />
                                                </>
                                            )}
                                            {s.icon === 'check' && (
                                                <>
                                                    <circle cx="12" cy="12" r="9" />
                                                    <path d="m9 12 2 2 4-4" />
                                                </>
                                            )}
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">{s.step}</p>
                                        <p className="text-xs font-medium text-slate-800 leading-snug">{s.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    {/* Leave Balance */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Leave Balance</h3>
                        <div className="space-y-4">
                            {leaveBalances.map((l) => (
                                <div key={l.label}>
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-slate-600">{l.label}</span>
                                        <span className="font-semibold text-slate-800">{l.used} / {l.total} Days</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${l.color}`} style={{ width: `${Math.min(100, (l.used / l.total) * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Leave Policy */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Leave Policy</h3>
                        <div className="space-y-3">
                            {leavePolicy.map((p) => (
                                <div key={p.label} className="flex items-center gap-3">
                                    <span className={`w-9 h-9 rounded-lg ${p.bg} ${p.fg} flex items-center justify-center shrink-0`}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M2 12h20M12 2c2 3 3 7 3 10s-1 7-3 10c-2-3-3-7-3-10s1-7 3-10Z" />
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">{p.label}</p>
                                        <p className="text-[11px] text-slate-400">{p.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="flex items-center gap-1 text-xs font-medium text-indigo-600 mt-4">
                            View Full Leave Policy
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14m-6-6 6 6-6 6" />
                            </svg>
                        </button>
                    </div>

                    {/* Need Help */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-2">Need Help?</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            If you have any query related to leaves, please contact HR.
                        </p>
                        <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 11v3a1 1 0 0 0 1 1h1l3 5V5L5 10H4a1 1 0 0 0-1 1Z" />
                                <path d="M18 8a4 4 0 0 1 0 8" />
                            </svg>
                            Contact HR
                        </button>
                    </div>
                </div>
            </div>

            {/* Apply Leave Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply Leave">
                <form onSubmit={handleApply} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
                        <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option>Casual Leave</option>
                            <option>Sick Leave</option>
                            <option>Earned Leave</option>
                            <option>Comp Off</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">From</label>
                            <input
                                type="date"
                                required
                                value={form.from}
                                onChange={(e) => setForm({ ...form, from: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">To</label>
                            <input
                                type="date"
                                required
                                value={form.to}
                                onChange={(e) => setForm({ ...form, to: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                        <textarea
                            required
                            rows={3}
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            placeholder="Enter reason for leave"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                        >
                            Submit Request
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Leave Details Modal */}
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Leave Details">
                {selectedLeave && (
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Leave Type</span>
                            <span className="font-semibold text-slate-800">{selectedLeave.leave_type}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2">
                            <div>
                                <span className="text-slate-500 block text-xs">From</span>
                                <span className="font-medium text-slate-800">{formatDate(selectedLeave.from_date)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs">To</span>
                                <span className="font-medium text-slate-800">{formatDate(selectedLeave.to_date)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Total Days</span>
                            <span className="font-medium text-slate-800">{selectedLeave.total_days} Day{Number(selectedLeave.total_days) > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[selectedLeave.status] || 'bg-slate-50 text-slate-500'}`}>
                                {selectedLeave.status}
                            </span>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                            <span className="text-slate-500 block mb-1">Reason</span>
                            <p className="text-slate-800 bg-slate-50 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap">{selectedLeave.reason}</p>
                        </div>
                        {selectedLeave.reviewed_at && (
                            <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg flex flex-col gap-1">
                                <span>Reviewed at: {formatDate(selectedLeave.reviewed_at)}</span>
                            </div>
                        )}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setIsViewModalOpen(false)}
                                className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}