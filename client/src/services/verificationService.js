import api from './api'

const BASE = '/admin/personal-verification'

/**
 * Fetch all employee profiles.
 * @param {object} params - { status, department, search } — pass undefined to skip filters
 */
export const getAllProfiles = (params = {}) =>
  api.get(BASE, { params })

/**
 * Fetch complete profile for one employee (details + docs + logs).
 * @param {number} employeeId - integer employees.id (epd.employee_id)
 */
export const getProfile = (employeeId) =>
  api.get(`${BASE}/${employeeId}`)

/**
 * Approve an employee profile.
 * Route: PUT /api/admin/personal-verification/:employeeId/approve
 */
export const approveProfile = (employeeId, remarks) =>
  api.put(`${BASE}/${employeeId}/approve`, { remarks })

/**
 * Reject an employee profile (remarks mandatory).
 * Route: PUT /api/admin/personal-verification/:employeeId/reject
 */
export const rejectProfile = (employeeId, remarks) =>
  api.put(`${BASE}/${employeeId}/reject`, { remarks })

/**
 * Request profile resubmission.
 * Route: PUT /api/admin/personal-verification/:employeeId/resubmit
 */
export const requestResubmission = (employeeId, remarks) =>
  api.put(`${BASE}/${employeeId}/resubmit`, { remarks })

/**
 * Fetch verification history logs for an employee.
 * Route: GET /api/admin/personal-verification/:employeeId/logs
 */
export const getLogs = (employeeId) =>
  api.get(`${BASE}/${employeeId}/logs`)
