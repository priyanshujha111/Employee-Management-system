import { useState, useEffect } from 'react'
import Modal from '../../components/common/Modal'
import api from '../../services/api'



export default function Employees() {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [deptFilter, setDeptFilter] = useState('All Departments')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [departmentsList, setDepartmentsList] = useState([])
    const [form, setForm] = useState({ employeeId: '', firstName: '', lastName: '', email: '', phone: '', department: '', designation: '', password: '' })

    // Fetch employees and departments from backend on page load
    useEffect(() => {
        fetchEmployees()
        fetchDepartments()
    }, [])

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments')
            setDepartmentsList(res.data.data)
            if (res.data.data.length > 0) {
                setForm(f => ({ ...f, department: res.data.data[0].department_name }))
            }
        } catch (err) {
            console.error("Error fetching departments:", err)
        }
    }

    const fetchEmployees = async () => {
        try {
            setLoading(true)
            const res = await api.get('/employees')
            setEmployees(res.data.data)
            setError('')
        } catch (err) {
            console.error(err)
            setError('Failed to load employees. Make sure the backend server is running.')
        } finally {
            setLoading(false)
        }
    }

    const filtered = employees.filter((emp) => {
        const fullName = `${emp.first_name} ${emp.last_name || ''}`.toLowerCase()
        const matchesSearch =
            fullName.includes(search.toLowerCase()) ||
            emp.employee_id.toLowerCase().includes(search.toLowerCase())
        const matchesDept = deptFilter === 'All Departments' || emp.department_name === deptFilter
        return matchesSearch && matchesDept
    })

    const handleAddEmployee = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                employee_id: form.employeeId,
                first_name: form.firstName,
                last_name: form.lastName,
                email: form.email,
                phone: form.phone,
                gender: null,
                date_of_birth: null,
                hire_date: new Date().toISOString().split('T')[0],
                salary: 0,
                designation: form.designation,
                department_name: form.department,
                password: form.password,
            }
            await api.post('/employees', payload)
            await fetchEmployees()
            setForm({
                employeeId: '',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                department: departmentsList.length > 0 ? departmentsList[0].department_name : '',
                designation: '',
                password: ''
            })
            setIsModalOpen(false)
        } catch (err) {
            console.error(err)
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to add employee. Please check the details and try again.'
            alert(errorMsg)
        }
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/employees/${id}`)
            setEmployees(employees.filter((emp) => emp.id !== id))
        } catch (err) {
            console.error(err)
            alert('Failed to delete employee.')
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Employees</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Manage your organization's employees.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create Employee
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
                {/* Search + filter */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1 max-w-xs">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or ID..."
                            className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {['All Departments', ...departmentsList.map(d => d.department_name)].map((d) => (
                            <option key={d}>{d}</option>
                        ))}
                    </select>
                    <span className="text-sm text-slate-400 ml-auto">{filtered.length} employees</span>
                </div>

                {/* Loading / Error states */}
                {loading && (
                    <p className="text-center text-slate-400 text-sm py-8">Loading employees...</p>
                )}
                {!loading && error && (
                    <p className="text-center text-rose-500 text-sm py-8">{error}</p>
                )}

                {/* Table */}
                {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                    <th className="pb-2 font-medium text-xs">Employee ID</th>
                                    <th className="pb-2 font-medium text-xs">Name</th>
                                    <th className="pb-2 font-medium text-xs">Email</th>
                                    <th className="pb-2 font-medium text-xs">Department</th>
                                    <th className="pb-2 font-medium text-xs">Designation</th>
                                    <th className="pb-2 font-medium text-xs">Joining Date</th>
                                    <th className="pb-2 font-medium text-xs">Status</th>
                                    <th className="pb-2 font-medium text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((emp) => {
                                    const fullName = `${emp.first_name} ${emp.last_name || ''}`.trim()
                                    return (
                                        <tr key={emp.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-3 text-slate-700 text-xs">{emp.employee_id}</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
                                                        {fullName[0]}
                                                    </div>
                                                    <span className="text-slate-900 font-medium text-xs">{fullName}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-slate-600 text-xs">{emp.email}</td>
                                            <td className="py-3 text-slate-600 text-xs">{emp.department_name || '-'}</td>
                                            <td className="py-3 text-slate-600 text-xs">{emp.designation || '-'}</td>
                                            <td className="py-3 text-slate-600 text-xs">
                                                {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="py-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${emp.status === 'Active'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                >
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <button
                                                    onClick={() => handleDelete(emp.id)}
                                                    className="text-rose-500 hover:text-rose-600 text-xs font-medium"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-8">No employees found.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Add Employee Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Employee">
                <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                        <input
                            type="text"
                            required
                            value={form.employeeId}
                            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                            placeholder="e.g. EMP009"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                            <input
                                type="text"
                                required
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                placeholder="First name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                placeholder="Last name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="Enter email address"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="Enter phone number"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                        <select
                            value={form.department}
                            onChange={(e) => setForm({ ...form, department: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {departmentsList.map((d) => (
                                <option key={d.id} value={d.department_name}>{d.department_name}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">Note: department linking will be enabled once the Departments API is connected.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                        <input
                            type="text"
                            required
                            value={form.designation}
                            onChange={(e) => setForm({ ...form, designation: e.target.value })}
                            placeholder="e.g. Software Engineer"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Set Login Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="Set a password for this employee"
                                className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">This will be the employee's login password. Share it with them securely.</p>
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
                            Add Employee
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}