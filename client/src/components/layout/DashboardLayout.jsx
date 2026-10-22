import Sidebar from './AdminSidebar'

export default function DashboardLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  )
}