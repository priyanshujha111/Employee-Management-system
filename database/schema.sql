-- ============================================================
-- Employee Management System - Database Schema
-- ============================================================

-- ============================================================
-- Departments Table
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    head_name VARCHAR(100),
    head_email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Employees Table
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    date_of_birth DATE,
    hire_date DATE NOT NULL,
    salary DECIMAL(10,2),
    designation VARCHAR(100),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Users Table (Admin Login)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Attendance Table
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) DEFAULT 'Present'
        CHECK (
            status IN (
                'Present',
                'Absent',
                'Late',
                'On Leave',
                'Weekly Off'
            )
        ),
    working_hours VARCHAR(20),
    remarks TEXT,
    location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- ============================================================
-- Leave Requests Table
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(30) NOT NULL
        CHECK (
            leave_type IN (
                'Casual Leave',
                'Sick Leave',
                'Earned Leave',
                'Unpaid Leave',
                'Comp Off'
            )
        ),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Approved',
                'Rejected'
            )
        ),
    applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT REFERENCES employees(id),
    reviewed_at TIMESTAMP
);

-- ============================================================
-- Payroll Table
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    pay_month DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    hra DECIMAL(10,2) DEFAULT 0,
    conveyance_allowance DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    special_allowance DECIMAL(10,2) DEFAULT 0,
    provident_fund DECIMAL(10,2) DEFAULT 0,
    professional_tax DECIMAL(10,2) DEFAULT 0,
    income_tax DECIMAL(10,2) DEFAULT 0,
    esi DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL,
    total_deductions DECIMAL(10,2) NOT NULL,
    net_pay DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Paid'
            )
        ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, pay_month)
);

-- ============================================================
-- Recommended Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employee_department
ON employees(department_id);

CREATE INDEX IF NOT EXISTS idx_employee_email
ON employees(email);

CREATE INDEX IF NOT EXISTS idx_attendance_employee
ON attendance(employee_id);

CREATE INDEX IF NOT EXISTS idx_leave_employee
ON leave_requests(employee_id);

CREATE INDEX IF NOT EXISTS idx_payroll_employee
ON payroll(employee_id);

-- ============================================================
-- Events Table
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    tag VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Announcements Table
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Office Holidays Table
-- ============================================================
CREATE TABLE IF NOT EXISTS office_holidays (
    id SERIAL PRIMARY KEY,
    date INT NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    day VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- Password Reset Tokens Table
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
ON password_reset_tokens(token_hash);

