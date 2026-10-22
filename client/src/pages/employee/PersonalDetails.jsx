import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import * as personalService from '../../services/personalService';

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');
const UPLOAD_BASE = `${API_BASE.replace(/\/api$/, '')}/uploads`;

// Map UI document keys → multipart field names expected by Multer
const DOC_FIELD_MAP = {
  passportPhoto: 'passport_photo',
  addressProof: 'address_proof',
  aadhaar: 'aadhaar_file',
  pan: 'pan_file',
  qualification: 'qualification_certificate',
};

// Convert a server filename into a UI document object
const filenameToDoc = (filename) => {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
  return {
    file: null,
    preview: `${UPLOAD_BASE}/${filename}`,
    name: filename,
    size: 'Uploaded',
    date: new Date().toLocaleDateString(),
    type: isImage ? 'image/jpeg' : 'application/pdf',
  };
};

// Convert API documents row → UI documents state
const apiDocsToState = (docs) => {
  if (!docs) return { passportPhoto: null, addressProof: null, aadhaar: null, pan: null, qualification: null };
  return {
    passportPhoto: filenameToDoc(docs.passport_photo),
    addressProof: filenameToDoc(docs.address_proof),
    aadhaar: filenameToDoc(docs.aadhaar_file),
    pan: filenameToDoc(docs.pan_file),
    qualification: filenameToDoc(docs.qualification_certificate),
  };
};

// Calculate age from ISO date string
const calcAge = (dob) => {
  if (!dob) return '';
  const diff = Date.now() - new Date(dob).getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
};

// Calculate profile completion %
const calcCompletion = (data, docs) => {
  const requiredFields = ['fullName', 'gender', 'dob', 'email', 'phone',
    'currentAddress', 'permanentAddress', 'aadhaarNumber', 'panNumber',
    'highestQualification', 'accountNumber', 'bankName', 'ifsc'];
  const filled = requiredFields.filter(f => !!data[f]).length;
  const uploaded = Object.values(docs).filter(Boolean).length;
  return Math.round(((filled + uploaded) / (requiredFields.length + 5)) * 100);
};

// ==============================================================
// DocumentUpload Component — UI UNCHANGED, upload goes to API
// ==============================================================
const DocumentUpload = ({ label, documentKey, document, onUpload, onDelete, uploading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const validateAndProcess = (file) => {
    setError(null);
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Only PDF, JPG, JPEG and PNG files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maximum file size allowed is 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpload(documentKey, {
        file,
        preview: e.target.result,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        date: new Date().toLocaleDateString(),
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndProcess(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) validateAndProcess(e.target.files[0]);
  };

  const triggerFileSelect = () => {
    document?.getElementById?.(`file-upload-${documentKey}`)?.click();
    window.document.getElementById(`file-upload-${documentKey}`)?.click();
  };

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-slate-600">{label}</label>
      </div>

      {!document ? (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50'}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        >
          <input type="file" id={`file-upload-${documentKey}`} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-indigo-600 cursor-pointer hover:underline" onClick={triggerFileSelect}>Browse File</span> or drag &amp; drop
            </p>
            <p className="text-xs text-slate-500">Supported: PDF, JPG, PNG &bull; Maximum: 5 MB</p>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
              {document.type?.includes('image') ? (
                <img src={document.preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate" title={document.name}>📄 {document.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span>{document.size}</span>
                <span>&bull;</span>
                <span>{document.date}</span>
                <span className="bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase inline-block">Uploaded Successfully</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => window.open(document.preview, '_blank')} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              View
            </button>
            <button type="button" onClick={() => window.document.getElementById(`file-upload-replace-${documentKey}`)?.click()} className="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Replace
              <input type="file" id={`file-upload-replace-${documentKey}`} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} />
            </button>
            <button type="button" onClick={() => onDelete(documentKey)} className="text-xs font-medium text-red-600 hover:text-red-800 flex items-center gap-1 ml-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================================
// Main Component
// ==============================================================
export default function PersonalDetails() {
  const { user } = useContext(AuthContext);
  const employeeId = user?.employee_id;

  // ── State ────────────────────────────────────────────────────
  const EMPTY_FORM = {
    photoUrl: '', fullName: '', gender: '', nationality: '', age: '', dob: '',
    email: '', phone: '', currentAddress: '', permanentAddress: '',
    aadhaarNumber: '', panNumber: '',
    highestQualification: '',
    accountNumber: '', bankName: '', accountHolder: '', ifsc: '', branch: '',
    emergencyContactRelation: '', emergencyContactNumber: '',
    privacyAgreement: false,
    // sidebar extras
    department: '', designation: '', hireDate: '', employeeCode: '',
  };

  const EMPTY_DOCS = { passportPhoto: null, addressProof: null, aadhaar: null, pan: null, qualification: null };

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [documents, setDocuments] = useState(EMPTY_DOCS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null); // which doc is uploading
  const [toast, setToast] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('Draft');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load profile on mount ─────────────────────────────────────
  useEffect(() => {
    if (employeeId) loadProfile();
  }, [employeeId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [detailsRes, docsRes] = await Promise.allSettled([
        personalService.getPersonalDetails(employeeId),
        personalService.getDocuments(employeeId),
      ]);

      // Personal details
      if (detailsRes.status === 'fulfilled' && detailsRes.value.data?.data) {
        const d = detailsRes.value.data.data;
        const fullName = [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(' ');
        setFormData({
          photoUrl: '',
          fullName,
          gender: d.gender || '',
          nationality: d.nationality || '',
          dob: d.dob ? d.dob.split('T')[0] : '',
          age: d.dob ? calcAge(d.dob) : '',
          email: d.email || '',
          phone: d.phone || '',
          currentAddress: d.current_address || '',
          permanentAddress: d.permanent_address || '',
          aadhaarNumber: d.aadhaar_number || '',
          panNumber: d.pan_number || '',
          highestQualification: d.qualification || '',
          accountNumber: d.account_number || '',
          bankName: d.bank_name || '',
          accountHolder: d.account_holder_name || '',
          ifsc: d.ifsc_code || '',
          branch: d.branch || '',
          emergencyContactRelation: d.emergency_contact_relation || '',
          emergencyContactNumber: d.emergency_contact_number || '',
          privacyAgreement: false,
          department: d.department_name || '',
          designation: d.designation || '',
          hireDate: d.hire_date ? new Date(d.hire_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          employeeCode: d.emp_code || user?.username || '',
        });
        setVerificationStatus(d.verification_status || 'Draft');
      }

      // Documents
      if (docsRes.status === 'fulfilled' && docsRes.value.data?.data) {
        setDocuments(apiDocsToState(docsRes.value.data.data));
      }
    } catch {
      // 404 means no record yet — empty form is correct
    } finally {
      setLoading(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!formData.phone || !/^\d{10}$/.test(formData.phone))
      newErrors.phone = 'Valid 10-digit phone required.';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Valid email required.';
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber))
      newErrors.panNumber = 'Valid PAN required (e.g. ABCDE1234F).';
    if (formData.aadhaarNumber && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(formData.aadhaarNumber))
      newErrors.aadhaarNumber = 'Valid 12-digit Aadhaar required (format: 1234 5678 9012).';
    if (formData.emergencyContactNumber && !/^\d{10}$/.test(formData.emergencyContactNumber))
      newErrors.emergencyContactNumber = 'Valid 10-digit emergency contact number required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Build API payload ──────────────────────────────────────────
  const buildPayload = () => {
    const parts = formData.fullName.trim().split(/\s+/);
    return {
      first_name: parts[0] || '',
      middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
      last_name: parts.length > 1 ? parts[parts.length - 1] : '',
      gender: formData.gender,
      dob: formData.dob || null,
      nationality: formData.nationality,
      email: formData.email,
      phone: formData.phone,
      current_address: formData.currentAddress,
      permanent_address: formData.permanentAddress,
      aadhaar_number: formData.aadhaarNumber,
      pan_number: formData.panNumber,
      qualification: formData.highestQualification,
      bank_name: formData.bankName,
      account_holder_name: formData.accountHolder,
      account_number: formData.accountNumber,
      ifsc_code: formData.ifsc,
      branch: formData.branch || '',
      emergency_contact_relation: formData.emergencyContactRelation,
      emergency_contact_number: formData.emergencyContactNumber,
      profile_completion: calcCompletion(formData, documents),
    };
  };

  // ── Save Draft ────────────────────────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await personalService.savePersonalDetails(employeeId, buildPayload());
      showToast('Details saved successfully!');
      await loadProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save details.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit for verification ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the validation errors.', 'error');
      return;
    }
    if (!formData.privacyAgreement) {
      showToast('Please accept the Privacy Agreement.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await personalService.savePersonalDetails(employeeId, buildPayload());
      await personalService.submitProfile(employeeId);
      showToast('Profile submitted for verification!');
      setVerificationStatus('Pending');
      await loadProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Document Upload ───────────────────────────────────────────
  const handleUpload = async (key, docData) => {
    // Immediate local preview (same UX as before)
    setDocuments(prev => ({ ...prev, [key]: docData }));

    // Upload to backend
    setUploadingKey(key);
    try {
      const fd = new FormData();
      fd.append(DOC_FIELD_MAP[key], docData.file);
      const res = await personalService.uploadDocument(employeeId, fd, (e) => {
        // progress available via e.loaded / e.total if needed
      });
      // Refresh doc state with server filename
      const serverDocs = res.data?.data;
      if (serverDocs) setDocuments(apiDocsToState(serverDocs));
      showToast('Document uploaded successfully!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Document upload failed.', 'error');
      // Revert local state on failure
      setDocuments(prev => ({ ...prev, [key]: null }));
    } finally {
      setUploadingKey(null);
    }
  };

  // ── Document Delete (local only — no delete endpoint) ─────────
  const handleDelete = (key) => {
    setDocuments(prev => ({ ...prev, [key]: null }));
  };

  // ── Form field change ─────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'dob' ? { age: calcAge(value) } : {}),
    }));
  };

  const handleReset = () => {
    setErrors({});
    setDocuments(EMPTY_DOCS);
    setFormData(EMPTY_FORM);
  };

  const completion = calcCompletion(formData, documents);

  // ── Loading spinner ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-slate-800 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto text-slate-800">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Personal Details</h1>
            <p className="text-slate-500 mt-1">Complete your onboarding information and upload required documents.</p>
          </div>
          {verificationStatus && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${verificationStatus === 'Verified' ? 'bg-green-100 text-green-700' :
              verificationStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                verificationStatus === 'Pending' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-600'
              }`}>{verificationStatus}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Form Area */}
        <div className="flex-1 space-y-6 w-full">
          <form id="personal-details-form" onSubmit={handleSubmit} className="space-y-6">

            {/* SECTION 1: Basic Information */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4 text-slate-800">Basic Information</h2>
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                <div className="shrink-0 w-full md:w-64">
                  <DocumentUpload
                    label="Passport Size Photo"
                    documentKey="passportPhoto"
                    document={documents.passportPhoto}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    uploading={uploadingKey === 'passportPhoto'}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Nationality</label>
                    <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Age</label>
                    <input type="text" name="age" value={formData.age} readOnly className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-default" />
                  </div>
                  <div className="sm:col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Date of Birth</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Contact Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4 text-slate-800">Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.email ? 'border-red-500' : 'border-slate-300'}`} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone <span className="text-red-500">*</span></label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.phone ? 'border-red-500' : 'border-slate-300'}`} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-600">Current Address</label>
                  </div>
                  <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange} rows="3" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  <DocumentUpload
                    label="Current Address Proof"
                    documentKey="addressProof"
                    document={documents.addressProof}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    uploading={uploadingKey === 'addressProof'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Permanent Address</label>
                  <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} rows="3" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>

            {/* SECTION 3: Identity Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4 text-slate-800">Identity Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-600">Aadhaar Number <span className="text-red-500">*</span></label>
                  </div>
                  <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} placeholder="1234 5678 9012" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-wide ${errors.aadhaarNumber ? 'border-red-500' : 'border-slate-300'}`} />
                  {errors.aadhaarNumber && <p className="text-red-500 text-xs mt-1">{errors.aadhaarNumber}</p>}
                  <DocumentUpload
                    label="Upload Aadhaar"
                    documentKey="aadhaar"
                    document={documents.aadhaar}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    uploading={uploadingKey === 'aadhaar'}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-600">PAN Number <span className="text-red-500">*</span></label>
                  </div>
                  <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase ${errors.panNumber ? 'border-red-500' : 'border-slate-300'}`} />
                  {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber}</p>}
                  <DocumentUpload
                    label="Upload PAN"
                    documentKey="pan"
                    document={documents.pan}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    uploading={uploadingKey === 'pan'}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Education */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4 text-slate-800">Education</h2>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-600">Highest Qualification</label>
                </div>
                <input type="text" name="highestQualification" value={formData.highestQualification} onChange={handleChange} className="w-full md:w-1/2 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                <div className="w-full md:w-1/2 mt-2">
                  <DocumentUpload
                    label="Upload Qualification Documents"
                    documentKey="qualification"
                    document={documents.qualification}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    uploading={uploadingKey === 'qualification'}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5: Bank Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4 text-slate-800">Bank Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Account Number</label>
                  <input type="password" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-widest" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Bank Name</label>
                  <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Account Holder</label>
                  <input type="text" name="accountHolder" value={formData.accountHolder} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">IFSC Code</label>
                  <input type="text" name="ifsc" value={formData.ifsc} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Branch</label>
                  <input type="text" name="branch" value={formData.branch} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>

            {/* SECTION 6: Emergency Contact */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold border-b pb-3 mb-4 text-slate-800">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Relation</label>
                  <input type="text" name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleChange} placeholder="e.g. Father, Mother, Spouse" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Contact Number</label>
                  <input type="text" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleChange} placeholder="10-digit mobile number" className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.emergencyContactNumber ? 'border-red-500' : 'border-slate-300'}`} />
                  {errors.emergencyContactNumber && <p className="text-red-500 text-xs mt-1">{errors.emergencyContactNumber}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 7: Agreement */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-inner border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="privacyAgreement" checked={formData.privacyAgreement} onChange={handleChange} className="mt-1 w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                <div>
                  <p className="font-medium text-slate-800">Privacy Agreement</p>
                  <p className="text-sm text-slate-500 mt-1">I acknowledge that the information provided is correct and complete to the best of my knowledge. I consent to the processing of my personal data.</p>
                </div>
              </label>
            </div>

            {/* Bottom Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t border-slate-200">
              <button type="button" onClick={handleReset} className="px-6 py-2.5 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Reset
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button type="submit" form="personal-details-form" disabled={submitting} className="px-6 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Submit Details'}
              </button>
            </div>

          </form>
        </div>

        {/* Right Sidebar Area */}
        <div className="w-full lg:w-80 space-y-6 shrink-0 lg:sticky lg:top-6">

          {/* RIGHT SIDEBAR CARD: Profile Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="relative z-10 flex flex-col items-center mt-6">
              <img
                src={documents.passportPhoto?.preview || formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName || 'Employee')}&background=6366f1&color=fff&size=96`}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-3 bg-white"
              />
              <h3 className="text-xl font-bold text-slate-800">{formData.fullName || '—'}</h3>
              <p className="text-indigo-600 font-medium text-sm mb-1">{formData.designation || 'Employee'}</p>
              <p className="text-slate-500 text-xs mb-4">{formData.department || 'Department'}</p>

              <div className="w-full space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Employee ID</span>
                  <span className="font-medium text-slate-800">{formData.employeeCode || user?.username || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Joining Date</span>
                  <span className="font-medium text-slate-800">{formData.hireDate || '—'}</span>
                </div>
                <div className="flex flex-col border-b border-slate-100 pb-2">
                  <span className="text-slate-500 mb-1">Email</span>
                  <span className="font-medium text-slate-800 truncate">{formData.email || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-medium text-slate-800">{formData.phone || '—'}</span>
                </div>
              </div>

              <div className="w-full mt-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Profile Completion</span>
                  <span className="text-sm font-bold text-indigo-600">{completion}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${completion}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENT STATUS CARD */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Document Status</h3>
            <ul className="space-y-3">
              {[
                { name: 'Photo', key: 'passportPhoto' },
                { name: 'Aadhaar', key: 'aadhaar' },
                { name: 'PAN', key: 'pan' },
                { name: 'Qualification', key: 'qualification' },
                { name: 'Address Proof', key: 'addressProof' },
              ].map((doc) => {
                const isUploaded = !!documents[doc.key];
                return (
                  <li key={doc.key} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2">
                      <svg className={`w-4 h-4 ${isUploaded ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {doc.name}
                    </span>
                    <span className={`${isUploaded ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'} text-xs font-bold px-2.5 py-1 rounded-full`}>
                      {isUploaded ? 'Uploaded' : 'Pending'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
