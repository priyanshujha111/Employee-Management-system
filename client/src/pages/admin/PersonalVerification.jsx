import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as verificationService from '../../services/verificationService';

const UPLOAD_BASE = `http://${window.location.hostname}:5000/uploads`;

// ── Status → color tokens (single source of truth) ─────────────
const STATUS_STYLES = {
  Pending: { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  Verified: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  Rejected: { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
  Draft: { badge: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  'Pending Resubmission': { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
};
const statusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES.Draft;

const StatusBadge = ({ status }) => {
  const s = statusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status || 'Draft'}
    </span>
  );
};

const LetterAvatar = ({ name, size = 'w-10 h-10', text = 'text-sm' }) => {
  const initials = (name || '?').trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className={`${size} rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold ${text} ring-1 ring-inset ring-indigo-100 shrink-0`}>
      {initials}
    </div>
  );
};

const Spinner = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16">
    <div className="w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
    {label && <p className="text-sm text-slate-400">{label}</p>}
  </div>
);

// Small labeled value used across the Overview tab
const Field = ({ label, value, mono = false }) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">{label}</p>
    <p className={`text-sm text-slate-800 ${mono ? 'font-mono tracking-tight' : 'font-medium'}`}>{value || '—'}</p>
  </div>
);

const SectionCard = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">{title}</h4>
    {children}
  </div>
);

const REQUIRED_FIELDS = [
  { key: 'first_name', label: 'Full Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'current_address', label: 'Current Address' },
  { key: 'permanent_address', label: 'Permanent Address' },
  { key: 'aadhaar_number', label: 'Aadhaar Number' },
  { key: 'pan_number', label: 'PAN Number' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'account_number', label: 'Account Number' },
  { key: 'ifsc_code', label: 'IFSC Code' },
  { key: 'emergency_contact_relation', label: 'Emergency Contact Relation' },
  { key: 'emergency_contact_number', label: 'Emergency Contact Number' },
];

const REQUIRED_DOCS = [
  { key: 'passport_photo', label: 'Passport Size Photo' },
  { key: 'address_proof', label: 'Address Proof' },
  { key: 'aadhaar_file', label: 'Aadhaar Card' },
  { key: 'pan_file', label: 'PAN Card' },
  { key: 'qualification_certificate', label: 'Qualification Certificate' },
];

export default function PersonalVerification() {
  // ── List state ────────────────────────────────────────────────
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  // ── Drawer state ──────────────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | documents | history
  const [adminRemarks, setAdminRemarks] = useState('');
  const [remarksInvalid, setRemarksInvalid] = useState(false);
  const remarksRef = useRef(null);
  const [docStatuses, setDocStatuses] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // ── Toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch employee list ───────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await verificationService.getAllProfiles();
      setEmployees(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load profiles.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ── Derived stats ─────────────────────────────────────────────
  const stats = useMemo(() => ({
    pending: employees.filter(e => e.verification_status === 'Pending').length,
    verified: employees.filter(e => e.verification_status === 'Verified').length,
    rejected: employees.filter(e => e.verification_status === 'Rejected').length,
    today: employees.filter(e => {
      const d = new Date(e.updated_at);
      const t = new Date();
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    }).length,
  }), [employees]);

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department_name).filter(Boolean));
    return [...set];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return employees.filter(e => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      const empCode = (e.emp_code || '').toLowerCase();
      const email = (e.email || e.e_email || '').toLowerCase();
      const matchSearch = !q || name.includes(q) || empCode.includes(q) || email.includes(q);
      const matchDept = filterDept === 'All' || e.department_name === filterDept;
      const matchStatus = filterStatus === 'All' || e.verification_status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    }).sort((a, b) => {
      const da = new Date(a.updated_at), db = new Date(b.updated_at);
      return sortBy === 'Newest' ? db - da : da - db;
    });
  }, [employees, searchTerm, filterDept, filterStatus, sortBy]);

  // ── Open drawer: load full profile ───────────────────────────
  const handleReviewClick = async (emp) => {
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setSelectedProfile(null);
    setAdminRemarks('');
    setRemarksInvalid(false);
    setDocStatuses({});
    setActiveTab('overview');
    try {
      const [profileRes, logsRes] = await Promise.all([
        verificationService.getProfile(emp.employee_id),
        verificationService.getLogs(emp.employee_id),
      ]);
      setSelectedProfile({
        ...(profileRes.data?.data || {}),
        logs: logsRes.data?.data || [],
        rawEmp: emp,
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load profile.', 'error');
      setIsDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedProfile(null), 300);
  };

  // ── Approval actions ──────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedProfile) return;
    const { total } = getMissingItems(selectedProfile.details, selectedProfile.documents);
    if (total > 0) {
      showToast('Cannot approve — profile is incomplete. Fill all fields and upload all documents.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await verificationService.approveProfile(selectedProfile.rawEmp.employee_id, adminRemarks);
      showToast('Profile verified successfully');
      closeDrawer();
      await fetchEmployees();
    } catch (err) {
      console.error('approveProfile failed:', err?.response?.status, err?.response?.data || err);
      showToast(err.response?.data?.message || err.message || 'Approval failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProfile) return;
    if (!adminRemarks.trim()) {
      setRemarksInvalid(true);
      remarksRef.current?.focus();
      showToast('Admin remarks are mandatory for rejection.', 'error');
      return;
    }
    setRemarksInvalid(false);
    setActionLoading(true);
    try {
      await verificationService.rejectProfile(selectedProfile.rawEmp.employee_id, adminRemarks);
      showToast('Profile rejected.', 'error');
      closeDrawer();
      await fetchEmployees();
    } catch (err) {
      // Log the real cause — network error, 4xx/5xx, wrong payload shape, etc.
      console.error('rejectProfile failed:', err?.response?.status, err?.response?.data || err);
      showToast(err.response?.data?.message || err.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!selectedProfile) return;
    setActionLoading(true);
    try {
      await verificationService.requestResubmission(selectedProfile.rawEmp.employee_id, adminRemarks);
      showToast('Resubmission requested successfully.');
      closeDrawer();
      await fetchEmployees();
    } catch (err) {
      console.error('requestResubmission failed:', err?.response?.status, err?.response?.data || err);
      showToast(err.response?.data?.message || err.message || 'Request failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocAction = (docId, action) => {
    setDocStatuses(prev => ({ ...prev, [docId]: { ...prev[docId], status: action } }));
  };
  const handleDocComment = (docId, comment) => {
    setDocStatuses(prev => ({ ...prev, [docId]: { ...prev[docId], comment } }));
  };

  const handleDownload = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'document';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast('Failed to download document.', 'error');
    }
  };

  const getMissingItems = (d, doc) => {
    const missingFields = REQUIRED_FIELDS.filter(f => !d?.[f.key]).map(f => f.label);
    const missingDocs = REQUIRED_DOCS.filter(f => !doc?.[f.key]).map(f => f.label);
    return { missingFields, missingDocs, total: missingFields.length + missingDocs.length };
  };

  const getEmpName = (emp) =>
    `${emp.first_name || emp.e_first || ''} ${emp.last_name || emp.e_last || ''}`.trim() || 'Unknown';
  const getEmpEmail = (emp) => emp.email || emp.e_email || '—';

  // ── Document tile ─────────────────────────────────────────────
  const DocTile = ({ label, filename, docId }) => {
    if (!filename) return (
      <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-xs text-slate-400">Not uploaded yet</p>
        </div>
      </div>
    );
    const ext = filename.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
    const url = `${UPLOAD_BASE}/${filename}`;
    const docStatus = docStatuses[docId]?.status;

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0 w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            {isImage ? (
              <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
              {docStatus && (
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${docStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {docStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{filename}</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setPreviewDoc({ url, label, isImage, filename })} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View</button>
              <button onClick={() => handleDownload(url, filename)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Download</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => handleDocAction(docId, 'Approved')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${docStatus === 'Approved' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}
          >
            Approve
          </button>
          <button
            onClick={() => handleDocAction(docId, 'Rejected')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${docStatus === 'Rejected' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600'}`}
          >
            Reject
          </button>
          <input
            type="text"
            placeholder="Note about this document…"
            className="flex-1 min-w-0 text-xs px-2.5 py-1 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-400 outline-none bg-white"
            value={docStatuses[docId]?.comment || ''}
            onChange={(e) => handleDocComment(docId, e.target.value)}
          />
        </div>
      </div>
    );
  };

  // ── Drawer content ────────────────────────────────────────────
  const renderDrawer = () => {
    if (drawerLoading) return <Spinner label="Loading profile…" />;
    if (!selectedProfile) return null;

    const { details, documents, logs, rawEmp } = selectedProfile;
    const d = details || {};
    const doc = documents || {};
    const name = getEmpName(rawEmp);
    const { missingFields, missingDocs, total: missingCount } = getMissingItems(d, doc);
    const requiredTotal = REQUIRED_FIELDS.length + REQUIRED_DOCS.length;
    const completedPct = Math.round(((requiredTotal - missingCount) / requiredTotal) * 100);
    const isComplete = missingCount === 0;

    const TABS = [
      { key: 'overview', label: 'Overview' },
      { key: 'documents', label: 'Documents', badge: missingDocs.length || null },
      { key: 'history', label: 'History', badge: logs?.length || null },
    ];

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        {/* Identity strip */}
        <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            {doc.passport_photo ? (
              <img src={`${UPLOAD_BASE}/${doc.passport_photo}`} alt={name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow" />
            ) : (
              <LetterAvatar name={name} size="w-14 h-14" text="text-base" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 truncate">{name}</h3>
                <StatusBadge status={d.verification_status} />
              </div>
              <p className="text-sm text-slate-500 truncate">
                {d.designation || 'Employee'} · {d.department_name || 'No department'} · {d.emp_code || rawEmp.emp_code || '—'}
              </p>
            </div>
          </div>

          {/* Completion progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${completedPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 shrink-0">{completedPct}% complete</span>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {tab.label}
                {!!tab.badge && (
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable tab body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {!isComplete && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{missingCount} item{missingCount > 1 ? 's' : ''} still missing</p>
                    <p className="text-xs text-amber-700 mt-1">{missingFields.concat(missingDocs).join(' · ')}</p>
                  </div>
                </div>
              )}

              <SectionCard title="Basic Information">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date of Birth" value={d.dob ? new Date(d.dob).toLocaleDateString('en-IN') : null} />
                  <Field label="Gender" value={d.gender} />
                </div>
              </SectionCard>

              <SectionCard title="Contact">
                <div className="space-y-4">
                  <Field label="Current Address" value={d.current_address} />
                  <Field label="Permanent Address" value={d.permanent_address} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone" value={d.phone} />
                    <Field label="Alternate Phone" value={d.alternate_phone} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Identity">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Aadhaar Number" value={d.aadhaar_number} mono />
                  <Field label="PAN Number" value={d.pan_number?.toUpperCase()} mono />
                </div>
              </SectionCard>

              <SectionCard title="Education">
                <Field label="Qualification" value={d.qualification} />
              </SectionCard>

              <SectionCard title="Bank Details">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Account Holder" value={d.account_holder_name} />
                  <Field label="Bank Name" value={d.bank_name} />
                  <Field label="Account Number" value={d.account_number} mono />
                  <Field label="IFSC" value={d.ifsc_code?.toUpperCase()} mono />
                  <Field label="Branch" value={d.branch} />
                </div>
              </SectionCard>

              <SectionCard title="Emergency Contact">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Relation" value={d.emergency_contact_relation} />
                  <Field label="Contact Number" value={d.emergency_contact_number} />
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              <DocTile label="Passport Size Photo" filename={doc.passport_photo} docId="passport_photo" />
              <DocTile label="Address Proof" filename={doc.address_proof} docId="address_proof" />
              <DocTile label="PAN Card" filename={doc.pan_file} docId="pan_file" />
              <DocTile label="Aadhaar Card" filename={doc.aadhaar_file} docId="aadhaar_file" />
              <DocTile label="Qualification Certificate" filename={doc.qualification_certificate} docId="qualification_certificate" />
            </div>
          )}

          {activeTab === 'history' && (
            logs && logs.length > 0 ? (
              <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                {logs.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${idx === logs.length - 1 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                    <p className="text-sm font-semibold text-slate-800">{item.status}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(item.created_at).toLocaleString('en-IN')} · {item.admin_name || 'System'}</p>
                    {item.remarks && <p className="text-xs text-slate-500 mt-1.5 bg-slate-100 rounded-lg px-3 py-2 inline-block">{item.remarks}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-sm text-slate-400">No verification history yet.</p>
              </div>
            )
          )}
        </div>

        {/* Sticky decision footer — always visible regardless of tab */}
        <div className="border-t border-slate-200 bg-white p-4 space-y-3">
          <textarea
            ref={remarksRef}
            rows="2"
            placeholder={isComplete ? 'Add a remark (optional for approval, required for rejection)…' : 'Add a remark for the employee…'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm resize-none transition-colors ${remarksInvalid ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/40' : 'border-slate-200 focus:ring-indigo-400'}`}
            value={adminRemarks}
            onChange={e => { setAdminRemarks(e.target.value); if (remarksInvalid) setRemarksInvalid(false); }}
          />
          {remarksInvalid && (
            <p className="text-xs font-medium text-rose-600 -mt-2">Add a remark before rejecting — it's shown to the employee.</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={actionLoading || !isComplete}
              title={!isComplete ? 'Complete all fields and documents to enable approval' : ''}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isComplete ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {actionLoading ? 'Working…' : isComplete ? 'Approve' : 'Approve (incomplete)'}
            </button>
            <button onClick={handleReject} disabled={actionLoading} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              Reject
            </button>
            <button onClick={handleResubmit} disabled={actionLoading} className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              Request Resubmission
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Personal Verification</h1>
          <p className="text-sm text-slate-400 mt-0.5">Review employee profiles and approve, reject, or request changes</p>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Pending', count: stats.pending, accent: 'bg-amber-500', text: 'text-amber-600' },
          { title: 'Verified', count: stats.verified, accent: 'bg-emerald-500', text: 'text-emerald-600' },
          { title: 'Rejected', count: stats.rejected, accent: 'bg-rose-500', text: 'text-rose-600' },
          { title: 'Submitted Today', count: stats.today, accent: 'bg-sky-500', text: 'text-sky-600' },
        ].map((card, i) => (
          <div key={i} className="relative bg-white rounded-xl border border-slate-200 p-4 pl-5 overflow-hidden">
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${card.accent}`} />
            <p className="text-xs font-medium text-slate-400">{card.title}</p>
            <p className={`text-2xl font-bold mt-1 ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Search</label>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Name, ID, email…" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="w-full md:w-44">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Department</label>
          <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="All">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
          <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All statuses</option>
            {['Pending', 'Verified', 'Rejected', 'Draft', 'Pending Resubmission'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="w-full md:w-40">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Sort</label>
          <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="Newest">Newest first</option>
            <option value="Oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Profile</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7"><Spinner label="Loading profiles…" /></td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-14 text-center text-sm text-slate-400">No records match your filters.</td></tr>
              ) : filteredEmployees.map(emp => {
                const name = getEmpName(emp);
                const email = getEmpEmail(emp);
                const pct = emp.profile_completion || 0;
                return (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <LetterAvatar name={name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                          <p className="text-xs text-slate-400 truncate">{email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 font-mono">{emp.emp_code || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{emp.department_name || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{emp.updated_at ? new Date(emp.updated_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={emp.verification_status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleReviewClick(emp)} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors">
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER OVERLAY */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm" onClick={closeDrawer}>
          <div className="w-[560px] max-w-full bg-white h-full flex flex-col shadow-2xl animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-3.5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">Review Profile</h2>
              <button onClick={closeDrawer} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {renderDrawer()}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800 truncate">{previewDoc.label}</p>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-1 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-slate-50 flex items-center justify-center p-3">
              {previewDoc.isImage ? (
                <img src={previewDoc.url} alt={previewDoc.label} className="max-w-full max-h-[50vh] object-contain rounded-lg" />
              ) : (
                <iframe src={previewDoc.url} title={previewDoc.label} className="w-full h-[45vh] rounded-lg bg-white border border-slate-200" />
              )}
            </div>
            <div className="px-4 py-2.5 flex justify-end gap-2 border-t border-slate-100 bg-white">
              <button onClick={() => setPreviewDoc(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
              <button onClick={() => handleDownload(previewDoc.url, previewDoc.filename)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Download</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideInRight 0.25s cubic-bezier(0.4,0,0.2,1); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        .animate-pop-in { animation: popIn 0.15s cubic-bezier(0.4,0,0.2,1); }
      ` }} />
    </div>
  );
}
