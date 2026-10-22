import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import Modal from '../../components/common/Modal'

// Deterministic color palette — assigned by index since DB has no color field
const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#60A5FA', '#84CC16', '#EF4444']

const PAGE_SIZE = 8

export default function Departments() {
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    // Add/Edit Department modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDept, setEditingDept] = useState(null)
    const [form, setForm] = useState({ department_name: '', description: '', head_name: '', head_email: '', status: 'Active' })
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState('')

    useEffect(() => {
        fetchDepartments()
    }, [])

    const fetchDepartments = async () => {
        try {
            setLoading(true)
            setError('')
            const res = await api.get('/departments')
            // Normalize: map API fields → shape the existing JSX already uses
            const normalized = res.data.data.map((d, i) => ({
                ...d,
                name: d.department_name,
                head: d.head_name || '—',
                email: d.head_email || '—',
                // PostgreSQL COUNT() returns a string — Number() safely converts "3" → 3, "0" → 0, null → 0
                employees: Number(d.employee_count ?? 0),
                created: d.created_at
                    ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—',
                color: COLORS[i % COLORS.length],
            }))
            console.log('[DEBUG] Departments from API:', res.data.data)
            console.log('[DEBUG] Normalized departments:', normalized)
            setDepartments(normalized)
        } catch (err) {
            console.error(err)
            setError('Failed to load departments. Make sure the backend server is running.')
        } finally {
            setLoading(false)
        }
    }

    const filtered = departments.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
    )

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const totalEmployees = departments.reduce((sum, d) => sum + Number(d.employees || 0), 0)
    console.log('[DEBUG] Total Employees:', totalEmployees)
    const totalDepartments = departments.length
    const departmentHeads = departments.length
    const avgPerDept = totalDepartments > 0 ? (totalEmployees / totalDepartments).toFixed(1) : '0'

    const handleDelete = async (id) => {
        try {
            await api.delete(`/departments/${id}`)
            setDepartments(departments.filter((d) => d.id !== id))
        } catch (err) {
            console.error(err)
            alert(err.response?.data?.message || 'Failed to delete department.')
        }
    }

    const handleEditClick = (dept) => {
        setEditingDept(dept)
        setForm({
            department_name: dept.department_name,
            description: dept.description || '',
            head_name: dept.head_name || '',
            head_email: dept.head_email || '',
            status: dept.status || 'Active'
        })
        setIsModalOpen(true)
    }

    const handleAddDepartment = async (e) => {
        e.preventDefault()
        setFormLoading(true)
        setFormError('')
        try {
            if (editingDept) {
                await api.put(`/departments/${editingDept.id}`, form)
            } else {
                await api.post('/departments', form)
            }
            await fetchDepartments()
            setForm({ department_name: '', description: '', head_name: '', head_email: '', status: 'Active' })
            setEditingDept(null)
            setIsModalOpen(false)
        } catch (err) {
            console.error(err)
            setFormError(err.response?.data?.message || 'Failed to save department.')
        } finally {
            setFormLoading(false)
        }
    }

    const stats = [
        { label: 'Total Departments', value: totalDepartments, sub: 'Active departments', bg: 'bg-blue-50', fg: 'text-blue-600' },
        { label: 'Total Employees', value: totalEmployees, sub: 'Across all departments', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
        { label: 'Department Heads', value: departmentHeads, sub: 'Leading departments', bg: 'bg-amber-50', fg: 'text-amber-600' },
        { label: 'Avg. Employees / Dept.', value: avgPerDept, sub: 'Average per department', bg: 'bg-violet-50', fg: 'text-violet-600' },
    ]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Departments</h2>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                        <span>Dashboard</span>
                        <span>&gt;</span>
                        <span className="text-slate-600">Departments</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Department
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                        <div className={`w-11 h-11 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={s.fg}>
                                <rect x="4" y="3" width="16" height="18" rx="1" />
                                <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-xl font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main grid: table + right sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Department list */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 text-sm">Department List</h3>
                        <div className="flex items-center gap-2">
                            <div className="relative">
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
                                    onChange={(e) => {
                                        setSearch(e.target.value)
                                        setPage(1)
                                    }}
                                    placeholder="Search departments..."
                                    className="pl-8 pr-3 py-1.5 w-44 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                                </svg>
                                Filter
                            </button>
                        </div>
                    </div>

                    {/* Loading / Error states */}
                    {loading && (
                        <p className="text-center text-slate-400 text-sm py-8">Loading departments...</p>
                    )}
                    {!loading && error && (
                        <p className="text-center text-rose-500 text-sm py-8">{error}</p>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b border-slate-100">
                                            <th className="pb-2 font-medium text-xs">#</th>
                                            <th className="pb-2 font-medium text-xs">Department Name</th>
                                            <th className="pb-2 font-medium text-xs">Department Head</th>
                                            <th className="pb-2 font-medium text-xs">Employees</th>
                                            <th className="pb-2 font-medium text-xs">Created On</th>
                                            <th className="pb-2 font-medium text-xs">Status</th>
                                            <th className="pb-2 font-medium text-xs">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((d, i) => (
                                            <tr key={d.id} className="border-b border-slate-50 last:border-0">
                                                <td className="py-3 text-slate-500 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{ backgroundColor: `${d.color}1A` }}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={d.color} strokeWidth="2">
                                                                <rect x="4" y="3" width="16" height="18" rx="1" />
                                                                <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-slate-900 font-medium text-xs">{d.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-semibold shrink-0">
                                                            {d.head && d.head !== '—' ? d.head[0] : '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-800 text-xs font-medium leading-tight">{d.head}</p>
                                                            <p className="text-slate-400 text-[11px] leading-tight">{d.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-slate-600 text-xs">{d.employees}</td>
                                                <td className="py-3 text-slate-600 text-xs">{d.created}</td>
                                                <td className="py-3">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${d.status === 'Active'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : 'bg-rose-50 text-rose-500'
                                                            }`}
                                                    >
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(d)}
                                                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(d.id)}
                                                            className="w-7 h-7 rounded-lg border border-rose-200 flex items-center justify-center text-rose-500 hover:bg-rose-50"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {paginated.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-8">No departments found.</p>
                                )}
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                    Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{' '}
                                    {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} departments
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        «
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        ‹
                                    </button>
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i + 1)}
                                            className={`w-7 h-7 rounded-lg text-xs font-medium ${page === i + 1
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        ›
                                    </button>
                                    <button
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    {/* Quick actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full flex items-center gap-2.5 text-sm text-slate-700 hover:text-indigo-600"
                            >
                                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </span>
                                Add Department
                            </button>
                            <button className="w-full flex items-center gap-2.5 text-sm text-slate-700 hover:text-indigo-600">
                                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
                                    </svg>
                                </span>
                                Import Departments
                            </button>
                            <button className="w-full flex items-center gap-2.5 text-sm text-slate-700 hover:text-indigo-600">
                                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 21V9m0 12 4-4m-4 4-4-4M4 3h16" />
                                    </svg>
                                </span>
                                Export Departments
                            </button>
                        </div>
                    </div>

                    {/* Department overview donut */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">Department Overview</h3>
                        <div className="relative flex items-center justify-center mb-3">
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={departments}
                                        dataKey="employees"
                                        nameKey="name"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={2}
                                    >
                                        {departments.map((d) => (
                                            <Cell key={d.id} fill={d.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute text-center">
                                <p className="text-lg font-bold text-slate-900">{totalEmployees}</p>
                                <p className="text-[10px] text-slate-400">Total Employees</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            {departments.map((d) => (
                                <div key={d.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                        <span className="text-slate-600">{d.name}</span>
                                    </div>
                                    <span className="text-slate-400">
                                        {totalEmployees > 0 ? Math.round((d.employees / totalEmployees) * 100) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* About */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 flex gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 text-sm mb-1.5">About Departments</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Departments help you organize your organization structure and manage employees efficiently.
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2">
                                <rect x="4" y="3" width="16" height="18" rx="1" />
                                <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Department Modal */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setForm({ department_name: '', description: '', head_name: '', head_email: '', status: 'Active' }); setEditingDept(null); setFormError('') }} title={editingDept ? "Edit Department" : "Add Department"}>
                <form onSubmit={handleAddDepartment} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={form.department_name}
                            onChange={(e) => setForm({ ...form, department_name: e.target.value })}
                            placeholder="e.g. Engineering"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Brief description of this department"
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Head</label>
                            <input
                                type="text"
                                value={form.head_name}
                                onChange={(e) => setForm({ ...form, head_name: e.target.value })}
                                placeholder="Full name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Head Email</label>
                            <input
                                type="email"
                                value={form.head_email}
                                onChange={(e) => setForm({ ...form, head_email: e.target.value })}
                                placeholder="head@company.com"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    {formError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg px-3 py-2 text-xs">
                            {formError}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => { setIsModalOpen(false); setForm({ department_name: '', description: '', head_name: '', head_email: '', status: 'Active' }); setEditingDept(null); setFormError('') }}
                            className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {formLoading ? (editingDept ? 'Saving...' : 'Adding...') : (editingDept ? 'Save Changes' : 'Add Department')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}