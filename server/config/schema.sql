-- ============================================
-- Employee Management System
-- Personal Details & Verification Schema
-- ============================================

-- Table 1: Employee Personal Details
CREATE TABLE IF NOT EXISTS employee_personal_details (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    gender VARCHAR(20),
    dob DATE,
    blood_group VARCHAR(10),
    marital_status VARCHAR(30),
    nationality VARCHAR(50),
    father_name VARCHAR(100),
    mother_name VARCHAR(100),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(150),
    current_address TEXT,
    permanent_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(10),
    aadhaar_number VARCHAR(20),
    pan_number VARCHAR(15),
    passport_number VARCHAR(20),
    driving_license VARCHAR(30),
    qualification VARCHAR(100),
    college VARCHAR(200),
    university VARCHAR(200),
    passing_year VARCHAR(10),
    experience VARCHAR(50),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(100),
    account_number VARCHAR(30),
    ifsc_code VARCHAR(20),
    branch VARCHAR(100),
    profile_completion INTEGER DEFAULT 0,
    verification_status VARCHAR(30) DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Employee Documents
CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    passport_photo VARCHAR(500),
    aadhaar_file VARCHAR(500),
    pan_file VARCHAR(500),
    address_proof VARCHAR(500),
    qualification_certificate VARCHAR(500),
    bank_passbook VARCHAR(500),
    other_document VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Personal Verification Logs
CREATE TABLE IF NOT EXISTS personal_verification_logs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
-- Holidays Table
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_date DATE UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
