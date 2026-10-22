import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import Modal from "../../components/common/Modal";
import api from "../../services/api";

const leaveTypes = [
    "All Types",
    "Casual Leave",
    "Sick Leave",
    "Earned Leave",
    "Comp Off",
    "Unpaid Leave",
];

const statuses = ["All Status", "Pending", "Approved", "Rejected"];

const statusStyles = {
    Approved: "bg-emerald-50 text-emerald-600",
    Pending: "bg-amber-50 text-amber-600",
    Rejected: "bg-rose-50 text-rose-500",
};

const typeColors = {
    "Casual Leave": "#4F46E5",
    "Sick Leave": "#3B82F6",
    "Earned Leave": "#10B981",
    "Comp Off": "#F59E0B",
    "Unpaid Leave": "#EF4444",
};

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const getEmployeeName = (leave) => {
    const name = `${leave.first_name || ""} ${leave.last_name || ""}`.trim();
    return name || `Employee #${leave.employee_id}`;
};

export default function LeaveManagement() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    const [typeFilter, setTypeFilter] = useState("All Types");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [search, setSearch] = useState("");

    const [selectedLeave, setSelectedLeave] = useState(null);
    const [viewModal, setViewModal] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        employee_id: "",
        leave_type: "Casual Leave",
        from_date: "",
        to_date: "",
        reason: "",
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    // ===========================
    // GET ALL LEAVES
    // ===========================

    const fetchLeaves = async () => {
        try {
            setLoading(true);

            const res = await api.get("/leaves");

            setLeaves(res.data.data || []);
        } catch (err) {
            console.log(err);
            alert("Failed to load leave requests");
        } finally {
            setLoading(false);
        }
    };

    // ===========================
    // APPROVE LEAVE
    // ===========================

    const approveLeave = async (id) => {
        try {
            await api.put(`/leaves/${id}`, {
                status: "Approved",
                reviewed_by: 1,
            });

            fetchLeaves();
        } catch (err) {
            console.log(err);
            alert("Unable to approve leave");
        }
    };

    // ===========================
    // REJECT LEAVE
    // ===========================

    const rejectLeave = async (id) => {
        try {
            await api.put(`/leaves/${id}`, {
                status: "Rejected",
                reviewed_by: 1,
            });

            fetchLeaves();
        } catch (err) {
            console.log(err);
            alert("Unable to reject leave");
        }
    };

    // ===========================
    // APPLY LEAVE
    // ===========================

    const handleApply = async (e) => {
        e.preventDefault();

        try {
            const from = new Date(form.from_date);
            const to = new Date(form.to_date);

            const total_days =
                Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;

            await api.post("/leaves", {
                employee_id: Number(form.employee_id),
                leave_type: form.leave_type,
                from_date: form.from_date,
                to_date: form.to_date,
                total_days,
                reason: form.reason,
            });

            setIsModalOpen(false);

            setForm({
                employee_id: "",
                leave_type: "Casual Leave",
                from_date: "",
                to_date: "",
                reason: "",
            });

            fetchLeaves();
        } catch (err) {
            console.log(err);
            alert("Unable to apply leave");
        }
    };

    // ===========================
    // FILTERS
    // ===========================

    const filtered = leaves.filter((leave) => {
        const matchesType =
            typeFilter === "All Types" || leave.leave_type === typeFilter;

        const matchesStatus =
            statusFilter === "All Status" || leave.status === statusFilter;

        const matchesSearch =
            (leave.first_name || "")
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            (leave.last_name || "")
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            String(leave.employee_id)
                .toLowerCase()
                .includes(search.toLowerCase());

        return matchesType && matchesStatus && matchesSearch;
    });

    // ===========================
    // STATISTICS
    // ===========================

    const total = leaves.length;

    const approved = leaves.filter((l) => l.status === "Approved").length;
    const pending = leaves.filter((l) => l.status === "Pending").length;
    const rejected = leaves.filter((l) => l.status === "Rejected").length;

    const stats = [
        {
            label: "Total Requests",
            value: total,
            sub: "All Requests",
            bg: "bg-blue-50",
            fg: "text-blue-600",
            icon: "file",
        },
        {
            label: "Approved",
            value: approved,
            sub: "Approved Leaves",
            bg: "bg-emerald-50",
            fg: "text-emerald-600",
            icon: "check",
        },
        {
            label: "Pending",
            value: pending,
            sub: "Waiting Approval",
            bg: "bg-amber-50",
            fg: "text-amber-600",
            icon: "clock",
        },
        {
            label: "Rejected",
            value: rejected,
            sub: "Rejected Leaves",
            bg: "bg-rose-50",
            fg: "text-rose-600",
            icon: "x",
        },
    ];

    const typeBreakdown = leaveTypes
        .filter((t) => t !== "All Types")
        .map((t) => ({
            name: t,
            value: leaves.filter((l) => l.leave_type === t).length,
            color: typeColors[t],
        }))
        .filter((item) => item.value > 0);

    const totalTypeBreakdown = typeBreakdown.reduce(
        (sum, item) => sum + item.value,
        0
    );

    const onLeaveList = leaves.filter((leave) => leave.status === "Approved");

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">Loading Leave Requests...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                        <span>Dashboard</span>
                        <span>&gt;</span>
                        <span className="text-slate-600">Leave Management</span>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                        <div className={`w-11 h-11 rounded-lg ${s.bg} ${s.fg} flex items-center justify-center shrink-0`}>
                            {s.icon === 'file' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 3v5h5" />
                                </svg>
                            )}
                            {s.icon === 'check' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            )}
                            {s.icon === 'clock' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 7v5l3 3" />
                                </svg>
                            )}
                            {s.icon === 'x' && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="m15 9-6 6m0-6 6 6" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-xl font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Table */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {leaveTypes.map((t) => <option key={t}>{t}</option>)}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {statuses.map((s) => <option key={s}>{s}</option>)}
                        </select>

                        <div className="relative flex-1 min-w-[140px]">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search employee..."
                                className="pl-8 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <span className="text-xs text-slate-400 ml-auto">{filtered.length} requests</span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                    <th className="pb-2 font-medium text-xs">Employee</th>
                                    <th className="pb-2 font-medium text-xs">Leave Type</th>
                                    <th className="pb-2 font-medium text-xs">From</th>
                                    <th className="pb-2 font-medium text-xs">To</th>
                                    <th className="pb-2 font-medium text-xs">Days</th>
                                    <th className="pb-2 font-medium text-xs">Status</th>
                                    <th className="pb-2 font-medium text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((l) => {
                                    const name = getEmployeeName(l)
                                    return (
                                        <tr key={l.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                                                        {name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 font-medium text-xs leading-tight">{name}</p>
                                                        <p className="text-slate-400 text-[11px] leading-tight">EMP{String(l.employee_id).padStart(3, '0')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span
                                                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: `${typeColors[l.leave_type] || '#94A3B8'}1A`, color: typeColors[l.leave_type] || '#64748B' }}
                                                >
                                                    {l.leave_type}
                                                </span>
                                            </td>
                                            <td className="py-3 text-slate-600 text-xs">{formatDate(l.from_date)}</td>
                                            <td className="py-3 text-slate-600 text-xs">{formatDate(l.to_date)}</td>
                                            <td className="py-3 text-slate-600 text-xs">{l.total_days}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[l.status]}`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {l.status === 'Pending' ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => approveLeave(l.id)}
                                                            className="w-7 h-7 rounded-lg border border-emerald-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-50"
                                                            title="Approve"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M20 6 9 17l-5-5" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => rejectLeave(l.id)}
                                                            className="w-7 h-7 rounded-lg border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-50"
                                                            title="Reject"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 6 6 18M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLeave(l)
                                                            setViewModal(true)
                                                        }}
                                                        className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-8">No leave requests found.</p>
                        )}
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    {/* Leave type breakdown */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Leave Type Breakdown</h3>
                        {totalTypeBreakdown > 0 ? (
                            <>
                                <div className="relative flex items-center justify-center mb-3">
                                    <ResponsiveContainer width="100%" height={150}>
                                        <PieChart>
                                            <Pie data={typeBreakdown} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={2}>
                                                {typeBreakdown.map((t) => (
                                                    <Cell key={t.name} fill={t.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute text-center">
                                        <p className="text-lg font-bold text-slate-900">{totalTypeBreakdown}</p>
                                        <p className="text-[10px] text-slate-400">Requests</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {typeBreakdown.map((t) => (
                                        <div key={t.name} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                                                <span className="text-slate-600">{t.name}</span>
                                            </div>
                                            <span className="text-slate-400">{t.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-slate-400">No data to display.</p>
                        )}
                    </div>

                    {/* Approved leaves */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-3">Approved Leaves</h3>
                        <div className="space-y-2.5">
                            {onLeaveList.slice(0, 5).map((l) => {
                                const name = getEmployeeName(l)
                                return (
                                    <div key={l.id} className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                                            {name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-700 truncate">{name}</p>
                                            <p className="text-[11px] text-slate-400">{l.leave_type}</p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 shrink-0">{formatDate(l.from_date)}</p>
                                    </div>
                                )
                            })}
                            {onLeaveList.length === 0 && (
                                <p className="text-xs text-slate-400">No approved leaves yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-3">Quick Actions</h3>
                        <div className="space-y-3">
                            {[
                                { title: 'Apply Leave', sub: 'Submit a new leave request', bg: 'bg-blue-50', fg: 'text-blue-600', onClick: () => setIsModalOpen(true) },
                                { title: 'Bulk Approve', sub: 'Approve multiple requests', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
                                { title: 'Leave Policy', sub: 'View organization leave policy', bg: 'bg-amber-50', fg: 'text-amber-600' },
                                { title: 'Generate Report', sub: 'Export leave report', bg: 'bg-violet-50', fg: 'text-violet-600' },
                            ].map((a) => (
                                <button key={a.title} onClick={a.onClick} className="w-full flex items-center gap-2.5 text-left">
                                    <span className={`w-8 h-8 rounded-lg ${a.bg} ${a.fg} flex items-center justify-center shrink-0`}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <path d="M14 3v5h5" />
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">{a.title}</p>
                                        <p className="text-[11px] text-slate-400">{a.sub}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Apply Leave Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply Leave">
                <form onSubmit={handleApply} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                        <input
                            type="number"
                            required
                            value={form.employee_id}
                            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                            placeholder="Enter employee ID"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
                        <select
                            value={form.leave_type}
                            onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {leaveTypes.filter((t) => t !== 'All Types').map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">From</label>
                            <input
                                type="date"
                                required
                                value={form.from_date}
                                onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">To</label>
                            <input
                                type="date"
                                required
                                value={form.to_date}
                                onChange={(e) => setForm({ ...form, to_date: e.target.value })}
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

            {/* View Leave Modal (for reason on approved/rejected) */}
            <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title="Leave Details">
                {selectedLeave && (
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Employee</span>
                            <span className="font-medium text-slate-800">{getEmployeeName(selectedLeave)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Leave Type</span>
                            <span className="font-medium text-slate-800">{selectedLeave.leave_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">From</span>
                            <span className="font-medium text-slate-800">{formatDate(selectedLeave.from_date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">To</span>
                            <span className="font-medium text-slate-800">{formatDate(selectedLeave.to_date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Days</span>
                            <span className="font-medium text-slate-800">{selectedLeave.total_days}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[selectedLeave.status]}`}>
                                {selectedLeave.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-1">Reason</p>
                            <p className="text-slate-800 bg-slate-50 rounded-lg p-3">{selectedLeave.reason}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
