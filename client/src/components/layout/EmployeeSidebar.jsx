import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
    { to: '/employee/dashboard', label: 'My Dashboard', icon: 'grid' },
    // { to: '/employee/attendance', label: 'My Attendance', icon: 'clock' },
    { to: '/employee/leave', label: 'My Leave', icon: 'calendar' },
    // { to: '/employee/payslips', label: 'My Payslips', icon: 'payslips' },
    { to: '/employee/personal-details', label: 'Personal Details', icon: 'star' },
    // { to: '/employee/settings', label: 'Settings', icon: 'settings' },
]

const icons = {
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    // payslips: (
    //     <>
    //         <rect x="3" y="4" width="18" height="16" rx="2" />
    //         <path d="M7 9h10M7 13h6M7 17h4" />
    //     </>
    // ),
    star: (
        <>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </>
    ),
    // settings: (
    //     <>
    //         <circle cx="12" cy="12" r="3" />
    //         <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    //     </>
    // ),
}

export default function EmployeeSidebar() {
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    return (
        <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
            <div className="flex items-center gap-2.5 px-5 py-5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    E
                </div>
                <div>
                    <p className="text-white font-bold text-sm leading-tight">EMS</p>
                    <p className="text-slate-400 text-[10px]">Employee Management System</p>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-1 mt-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {icons[item.icon]}
                        </svg>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="px-3 pb-5">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 w-full">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="M16 17l5-5-5-5" />
                        <path d="M21 12H9" />
                    </svg>
                    Logout
                </button>
            </div>
        </aside>
    )
}
