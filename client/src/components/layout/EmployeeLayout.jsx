import EmployeeSidebar from './EmployeeSidebar'

export default function EmployeeLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <EmployeeSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  )
}