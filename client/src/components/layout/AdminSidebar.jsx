import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/admin/employees', label: 'Employees', icon: 'users' },
    { to: '/admin/departments', label: 'Departments', icon: 'building' },
    { to: '/admin/attendance', label: 'Attendance', icon: 'clock' },
    { to: '/admin/leave', label: 'Leave Management', icon: 'calendar' },
    { to: '/admin/holidays', label: 'Holidays', icon: 'holiday' },
    { to: '/admin/verification', label: 'Personal Verification', icon: 'shield' },
    { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]

const icons = {
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    users: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
            <circle cx="17" cy="8" r="2.5" />
        </>
    ),
    building: (
        <>
            <rect x="4" y="3" width="16" height="18" rx="1" />
            <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
        </>
    ),
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
    holiday: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
            <path d="M12 14.5l.9 1.82 2.01.29-1.45 1.42.34 2-1.8-.95-1.8.95.34-2-1.45-1.42 2.01-.29z" />
        </>
    ),
    shield: (
        <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </>
    ),
    settings: (
        <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
        </>
    ),
}

export default function Sidebar() {
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
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 w-full"
                >
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
