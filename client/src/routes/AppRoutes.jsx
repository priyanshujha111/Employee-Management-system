import { Routes, Route, Navigate } from 'react-router-dom'

import Login from '../pages/Login'
import AdminDashboard from '../pages/admin/AdminDashboard'
import Employees from '../pages/admin/Employees'
import EmployeeDashboard from '../pages/employee/EmployeeDashboard'
import Departments from '../pages/admin/Departments'
import Attendance from '../pages/admin/Attendance'
import LeaveManagement from '../pages/admin/LeaveManagement'
import PersonalVerification from '../pages/admin/PersonalVerification'
import Settings from '../pages/admin/Settings'
import AdminHolidays from '../pages/admin/AdminHolidays'

import DashboardLayout from '../components/layout/DashboardLayout'
import EmployeeLayout from '../components/layout/EmployeeLayout'
import EmployeeAttendance from '../pages/employee/EmployeeAttendance'
import EmployeeLeave from '../pages/employee/EmployeeLeave'
import EmployeePayslip from '../pages/employee/EmployeePayslip'
import PersonalDetails from '../pages/employee/PersonalDetails'

export default function AppRoutes() {
  return (
    <Routes>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin/dashboard"
        element={
          <DashboardLayout title="Dashboard">
            <AdminDashboard />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/employees"
        element={
          <DashboardLayout title="Employees">
            <Employees />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/departments"
        element={
          <DashboardLayout title="Departments">
            <Departments />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/attendance"
        element={
          <DashboardLayout title="Attendance">
            <Attendance />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/leave"
        element={
          <DashboardLayout title="Leave Management">
            <LeaveManagement />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/holidays"
        element={
          <DashboardLayout title="Holidays">
            <AdminHolidays />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/verification"
        element={
          <DashboardLayout title="Personal Verification">
            <PersonalVerification />
          </DashboardLayout>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <DashboardLayout title="Settings">
            <Settings />
          </DashboardLayout>
        }
      />

      {/* EMPLOYEE ROUTES */}
      <Route
        path="/employee/dashboard"
        element={
          <EmployeeLayout>
            <EmployeeDashboard />
          </EmployeeLayout>
        }
      />
      <Route
        path="/employee/attendance"
        element={
          <EmployeeLayout>
            <EmployeeAttendance />
          </EmployeeLayout>
        }
      />
      <Route
        path="/employee/leave"
        element={
          <EmployeeLayout>
            <EmployeeLeave />
          </EmployeeLayout>
        }
      />
      <Route
        path="/employee/payslips"
        element={
          <EmployeeLayout>
            <EmployeePayslip />
          </EmployeeLayout>
        }
      />
      <Route
        path="/employee/personal-details"
        element={
          <EmployeeLayout>
            <PersonalDetails />
          </EmployeeLayout>
        }
      />

    </Routes>
  )
}