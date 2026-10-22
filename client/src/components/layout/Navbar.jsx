export default function Navbar({ title = 'Dashboard' }) {
  return (
    <header className="flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4">
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search employees, departments..."
            className="pl-9 pr-4 py-2 w-64 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button className="relative text-slate-500 hover:text-slate-700">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
            A
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">Admin</span>
        </div>
      </div>
    </header>
  )
}