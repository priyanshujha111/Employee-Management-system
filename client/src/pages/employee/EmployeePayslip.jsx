import { useState } from 'react'

const payslips = [
    { id: 1, month: 'May 2025', paidOn: 'May 1, 2025', amount: '$3,750.00' },
    { id: 2, month: 'Apr 2025', paidOn: 'Apr 1, 2025', amount: '$3,750.00' },
    { id: 3, month: 'Mar 2025', paidOn: 'Mar 1, 2025', amount: '$3,750.00' },
    { id: 4, month: 'Feb 2025', paidOn: 'Feb 1, 2025', amount: '$3,750.00' },
    { id: 5, month: 'Jan 2025', paidOn: 'Jan 1, 2025', amount: '$3,750.00' },
    { id: 6, month: 'Dec 2024', paidOn: 'Dec 1, 2024', amount: '$3,600.00' },
    { id: 7, month: 'Nov 2024', paidOn: 'Nov 1, 2024', amount: '$3,600.00' },
    { id: 8, month: 'Oct 2024', paidOn: 'Oct 1, 2024', amount: '$3,600.00' },
]

const earnings = [
    { label: 'Basic Salary', amount: 3000 },
    { label: 'House Rent Allowance', amount: 1000 },
    { label: 'Conveyance Allowance', amount: 300 },
    { label: 'Medical Allowance', amount: 300 },
    { label: 'Special Allowance', amount: 600 },
]

const deductions = [
    { label: 'Provident Fund (PF)', amount: 600 },
    { label: 'Professional Tax', amount: 100 },
    { label: 'Income Tax (TDS)', amount: 750 },
    { label: 'ESI', amount: 0 },
]

const fmt = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

export default function EmployeePayslip() {
    const [selectedId, setSelectedId] = useState(1)
    const [activeTab, setActiveTab] = useState('history')

    const selected = payslips.find((p) => p.id === selectedId)
    const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0)
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
    const netPay = totalEarnings - totalDeductions

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">My Payslip</h2>
                <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                    <span>Dashboard</span>
                    <span>&gt;</span>
                    <span className="text-slate-600">My Payslip</span>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                    <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="5" width="18" height="16" rx="2" />
                            <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Current Month</p>
                        <p className="text-lg font-bold text-slate-900">{selected.month}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Paid on {selected.paidOn}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Net Pay</p>
                        <p className="text-lg font-bold text-emerald-600">{fmt(netPay)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Take Home</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                    <div className="w-11 h-11 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <path d="M2 10h20" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Gross Salary</p>
                        <p className="text-lg font-bold text-slate-900">{fmt(totalEarnings)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Total Earnings</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                    <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 3v5h5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Total Deductions</p>
                        <p className="text-lg font-bold text-slate-900">{fmt(totalDeductions)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Total Deductions</p>
                    </div>
                </div>
            </div>

            {/* Tabs + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-6 border-b border-slate-100 flex-1">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                            }`}
                    >
                        Payslip History
                    </button>
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`pb-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                            }`}
                    >
                        Annual Summary
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
                        </svg>
                        Download
                    </button>
                    <button className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 14h12v7H6z" />
                        </svg>
                        Print
                    </button>
                </div>
            </div>

            {activeTab === 'history' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Payslip list */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900 text-sm">Payslip History</h3>
                            <select className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none">
                                <option>2025</option>
                                <option>2024</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            {payslips.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedId(p.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${selectedId === p.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="5" width="18" height="16" rx="2" />
                                            <path d="M3 10h18M8 3v4M16 3v4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800">{p.month}</p>
                                        <p className="text-[11px] text-slate-400">Paid on {p.paidOn}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-emerald-600">{p.amount}</p>
                                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                            Paid
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                            <p className="text-xs text-slate-500">Showing 1 to 8 of 12 payslips</p>
                            <div className="flex items-center gap-1">
                                <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">‹</button>
                                <button className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-medium">1</button>
                                <button className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50">2</button>
                                <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">›</button>
                            </div>
                        </div>
                    </div>

                    {/* Payslip detail */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                        {/* Company header */}
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">ABC Technologies Pvt. Ltd.</p>
                                    <p className="text-xs text-slate-400">123, Business Park, Sector 62,</p>
                                    <p className="text-xs text-slate-400">Noida, Uttar Pradesh - 201301</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-slate-900">Payslip</p>
                                <p className="text-xs text-slate-400">{selected.month}</p>
                            </div>
                        </div>

                        {/* Employee info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs mb-6 pb-6 border-b border-slate-100">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Employee Name</span>
                                <span className="font-medium text-slate-800">John Doe</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Date of Joining</span>
                                <span className="font-medium text-slate-800">Jan 10, 2023</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Employee ID</span>
                                <span className="font-medium text-slate-800">EMP001</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Pay Period</span>
                                <span className="font-medium text-slate-800">
                                    {selected.month.split(' ')[0]} 1 – {selected.month.split(' ')[0]} 31, {selected.month.split(' ')[1]}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Designation</span>
                                <span className="font-medium text-slate-800">Software Engineer</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Payment Date</span>
                                <span className="font-medium text-slate-800">{selected.paidOn}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Department</span>
                                <span className="font-medium text-slate-800">Engineering</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Bank Account</span>
                                <span className="font-medium text-slate-800">**** **** **** 1234</span>
                            </div>
                        </div>

                        {/* Earnings / Deductions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="bg-emerald-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-emerald-700">Earnings</p>
                                    <p className="text-xs font-medium text-emerald-700">Amount (USD)</p>
                                </div>
                                <div className="space-y-2">
                                    {earnings.map((e) => (
                                        <div key={e.label} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">{e.label}</span>
                                            <span className="font-medium text-slate-800">{fmt(e.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-emerald-100">
                                    <span className="text-sm font-semibold text-emerald-700">Total Earnings</span>
                                    <span className="text-sm font-bold text-emerald-700">{fmt(totalEarnings)}</span>
                                </div>
                            </div>

                            <div className="bg-rose-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-rose-600">Deductions</p>
                                    <p className="text-xs font-medium text-rose-600">Amount (USD)</p>
                                </div>
                                <div className="space-y-2">
                                    {deductions.map((d) => (
                                        <div key={d.label} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">{d.label}</span>
                                            <span className="font-medium text-slate-800">{fmt(d.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-rose-100">
                                    <span className="text-sm font-semibold text-rose-600">Total Deductions</span>
                                    <span className="text-sm font-bold text-rose-600">{fmt(totalDeductions)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary bar */}
                        <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-4 mb-4">
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Gross Salary</p>
                                <p className="text-sm font-bold text-slate-900">{fmt(totalEarnings)}</p>
                                <p className="text-[10px] text-slate-400">(A)</p>
                            </div>
                            <div className="text-center border-x border-slate-200">
                                <p className="text-xs text-slate-500">Total Deductions</p>
                                <p className="text-sm font-bold text-slate-900">{fmt(totalDeductions)}</p>
                                <p className="text-[10px] text-slate-400">(B)</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500">Net Pay (A - B)</p>
                                <p className="text-sm font-bold text-indigo-600">{fmt(netPay)}</p>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-sm font-medium text-indigo-600">Thank you for your hard work and dedication!</p>
                            <p className="text-xs text-slate-400 mt-1">This is a system generated payslip. No signature is required.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">
                    Annual summary chart coming soon.
                </div>
            )}
        </div>
    )
}