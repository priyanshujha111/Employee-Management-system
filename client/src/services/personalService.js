import api from './api'

const BASE = '/personal-details'

/**
 * Fetch personal details for a given employee.
 * @param {number} employeeId - integer employees.id
 */
export const getPersonalDetails = (employeeId) =>
  api.get(`${BASE}/${employeeId}`)

/**
 * Create or update personal details (backend upserts).
 * @param {number} employeeId
 * @param {object} data - form payload
 */
export const savePersonalDetails = (employeeId, data) =>
  api.put(`${BASE}/${employeeId}`, data)

/**
 * Upload one or more documents for an employee.
 * @param {number} employeeId
 * @param {FormData} formData - contains field names matching DB columns
 * @param {function} onUploadProgress - Axios progress callback
 */
export const uploadDocument = (employeeId, formData, onUploadProgress) =>
  api.post(`${BASE}/upload/${employeeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })

/**
 * Fetch uploaded document filenames for an employee.
 * @param {number} employeeId
 */
export const getDocuments = (employeeId) =>
  api.get(`${BASE}/documents/${employeeId}`)

/**
 * Submit the profile for admin verification (sets status → Pending).
 * @param {number} employeeId
 */
export const submitProfile = (employeeId) =>
  api.post(`${BASE}/submit/${employeeId}`)
