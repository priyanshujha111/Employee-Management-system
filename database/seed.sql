-- Seed data for testing

-- Sample departments
INSERT INTO departments (department_name, description) VALUES
('Engineering', 'Handles product development and technical work'),
('Human Resources', 'Manages recruitment and employee relations'),
('Sales & Marketing', 'Handles sales, marketing and client relations'),
('Finance', 'Manages accounts and financial planning'),
('IT Support', 'Provides internal technical support');

-- Sample employees
INSERT INTO employees (employee_id, first_name, last_name, email, phone, gender, date_of_birth, hire_date, salary, designation, department_id, status) VALUES
('EMP001', 'John', 'Doe', 'john.doe@company.com', '9876543210', 'Male', '1996-05-15', '2023-01-10', 50000, 'Software Engineer', 1, 'Active'),
('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '9876543211', 'Female', '1994-03-20', '2023-02-15', 45000, 'HR Executive', 2, 'Active'),
('EMP003', 'Michael', 'Brown', 'michael.brown@company.com', '9876543212', 'Male', '1990-07-10', '2022-11-01', 60000, 'Sales Manager', 3, 'Active');