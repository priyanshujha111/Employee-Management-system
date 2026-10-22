import { useEffect, useState, useCallback } from 'react'

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '')

const emptyForm = { holidayName: '', holidayDate: '', description: '' }

export default function AdminHolidays() {
    const [holidays, setHolidays] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)

    const fetchHolidays = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${API_BASE}/holidays`, { 
                credentials: 'include',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(`Request failed (${res.status})`)
            const json = await res.json()
            setHolidays(json.data || [])
        } catch (err) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchHolidays()
    }, [fetchHolidays])

    const resetForm = () => {
        setForm(emptyForm)
        setEditingId(null)
        setFormError(null)
    }

    const handleChange = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }))
    }

    const handleEdit = (h) => {
        setEditingId(h.id)
        setForm({
            holidayName: h.holidayName,
            holidayDate: h.holidayDate?.slice(0, 10) || '',
            description: h.description || '',
        })
        setFormError(null)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this holiday?')) return
        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${API_BASE}/holidays/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(`Delete failed (${res.status})`)
            setHolidays((prev) => prev.filter((h) => h.id !== id))
            if (editingId === id) resetForm()
        } catch (err) {
            setError(err.message || 'Could not delete holiday')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFormError(null)

        if (!form.holidayName.trim() || !form.holidayDate) {
            setFormError('Holiday name and date are required.')
            return
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('token') || '';
            const url = editingId ? `${API_BASE}/holidays/${editingId}` : `${API_BASE}/holidays`
            const method = editingId ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const errJson = await res.json().catch(() => null)
                throw new Error(errJson?.message || `Save failed (${res.status})`)
            }
            resetForm()
            fetchHolidays()
        } catch (err) {
            setFormError(err.message || 'Could not save holiday')
        } finally {
            setSaving(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Office Holidays</h2>
                <p className="text-sm text-slate-500 mt-1">Manage company holidays shown on the employee dashboard.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Add / Edit form */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-1 h-fit">
                    <h3 className="font-semibold text-slate-900 text-sm mb-4">
                        {editingId ? 'Edit Holiday' : 'Add Office Holiday'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Holiday Name</label>
                            <input
                                type="text"
                                value={form.holidayName}
                                onChange={handleChange('holidayName')}
                                placeholder="e.g. Diwali"
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Holiday Date</label>
                            <input
                                type="date"
                                value={form.holidayDate}
                                onChange={handleChange('holidayDate')}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description (optional)</label>
                            <textarea
                                value={form.description}
                                onChange={handleChange('description')}
                                rows={3}
                                placeholder="Any notes about this holiday"
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
                            />
                        </div>

                        {formError && <p className="text-xs text-rose-500">{formError}</p>}

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 text-xs font-medium text-white bg-indigo-600 rounded-lg px-3 py-2 hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : editingId ? 'Update Holiday' : 'Add Holiday'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Holiday list */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 text-sm">All Holidays</h3>
                        <span className="text-xs text-slate-400">{holidays.length} total</span>
                    </div>

                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-10 bg-slate-100 rounded-lg" />
                            <div className="h-10 bg-slate-100 rounded-lg" />
                            <div className="h-10 bg-slate-100 rounded-lg" />
                        </div>
                    ) : error ? (
                        <p className="text-xs text-rose-500">Couldn't load holidays. {error}</p>
                    ) : holidays.length === 0 ? (
                        <p className="text-xs text-slate-400">No holidays added yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {holidays.map((h) => (
                                <div
                                    key={h.id}
                                    className="flex items-center gap-3 border border-slate-100 rounded-lg px-3 py-2.5 hover:bg-slate-50"
                                >
                                    <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-500 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[9px] font-semibold">
                                            {new Date(h.holidayDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                        </span>
                                        <span className="text-sm font-bold">{new Date(h.holidayDate).getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{h.holidayName}</p>
                                        <p className="text-xs text-slate-400">{formatDate(h.holidayDate)}</p>
                                        {h.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{h.description}</p>}
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleEdit(h)}
                                            className="text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(h.id)}
                                            className="text-xs font-medium text-rose-500 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
