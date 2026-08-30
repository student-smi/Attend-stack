import { useEffect, useState, useMemo } from 'react'
import api from '../../api/axios'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import { FormField, fieldClass, validators, validate } from '../../components/FormField'

const EMPTY = {
  student_id: '', name: '', email: '', phone: '', password: '',
  gender: '', dob: '', address: '', class_id: '', roll_number: ''
}
const PAGE_SIZE = 10

export default function Students() {
  const [students, setStudents] = useState([])
  const [classes, setClasses]   = useState([])
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [search, setSearch]           = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [error, setError]             = useState('')
  const [formErrors, setFormErrors]   = useState({})
  const [page, setPage]               = useState(1)
  const [credentials, setCredentials] = useState(null)

  // Password change
  const [pwdModal, setPwdModal]     = useState(false)
  const [pwdTarget, setPwdTarget]   = useState(null)   // selected student
  const [newPwd, setNewPwd]         = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [pwdError, setPwdError]     = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const openPwdModal = (student) => {
    setPwdTarget(student)
    setNewPwd('')
    setShowPwd(false)
    setPwdError('')
    setPwdSuccess('')
    setPwdModal(true)
  }
  const closePwdModal = () => { setPwdModal(false); setPwdTarget(null) }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')
    if (!newPwd || newPwd.trim().length < 4) {
      setPwdError('Password must be at least 4 characters.')
      return
    }
    setPwdLoading(true)
    try {
      await api.patch(`/students/${pwdTarget.id}/change-password`, { new_password: newPwd.trim() })
      setPwdSuccess(`✅ Password changed successfully for ${pwdTarget.name}!`)
      setNewPwd('')
    } catch (err) {
      const detail = err.response?.data?.detail
      setPwdError(detail || 'Failed to change password.')
    } finally {
      setPwdLoading(false)
    }
  }

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get('/students/?limit=1000'),
      api.get('/classes/?limit=1000'),
    ])
    setStudents(s.data)
    setClasses(c.data)
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setError(''); setFormErrors({}); setModal(true) }
  const openEdit = (row) => { setEditing(row); setForm({ ...EMPTY, ...row }); setError(''); setFormErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null); setFormErrors({}) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')

    // Frontend validation
    const errs = validate({
      class_id:   [validators.required(form.class_id, 'Class')],
      student_id: [validators.required(form.student_id, 'Student ID')],
      name:       [validators.required(form.name, 'Full Name')],
      email:      [validators.email(form.email)],
      phone:      [validators.phone(form.phone)],
    })
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setFormErrors({})
    const payload = {
      ...form,
      gender: form.gender || null,
      dob: form.dob || null,
      class_id: form.class_id || null,
      phone: form.phone || null,
      address: form.address || null,
      roll_number: form.roll_number || null,
      password: form.password || null,
    }
    try {
      if (editing) {
        await api.put(`/students/${editing.id}`, payload)
        closeModal(); load()
      } else {
        const res = await api.post('/students/', payload)
        closeModal(); load()
        setCredentials({
          name: res.data.name,
          email: res.data.email,
          password: res.data.initial_password,
        })
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Something went wrong.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return
    await api.delete(`/students/${id}`)
    load()
  }

  const filtered = useMemo(() => students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    const matchClass = !filterClass || s.class_id === filterClass
    return matchSearch && matchClass
  }), [students, search, filterClass])

  const classMap = Object.fromEntries(classes.map(c => [c.id, `${c.name} - ${c.semester} (${c.section})`]))

  // Count per class
  const classCount = classes.map(c => ({
    ...c,
    count: students.filter(s => s.class_id === c.id).length
  }))

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleSearch = (val) => { setSearch(val);       setPage(1) }
  const handleFilter = (id)  => { setFilterClass(id);   setPage(1) }

  const columns = [
    { key: 'student_id',  label: 'ID' },
    { key: 'name',        label: 'Name' },
    { key: 'email',       label: 'Email' },
    { key: 'phone',       label: 'Phone' },
    { key: 'class_id',    label: 'Class', render: (v) => classMap[v] || '—' },
    { key: 'roll_number', label: 'Roll No.' },
    { key: 'gender',      label: 'Gender' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{students.length} enrolled students</p>
        </div>
        <button id="add-student-btn" className="btn-primary" onClick={openAdd}>+ Add Student</button>
      </div>

      {/* ── Class Count Badges ── */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              !filterClass
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            All ({students.length})
          </button>
          {classCount.map(c => (
            <button
              key={c.id}
              onClick={() => handleFilter(filterClass === c.id ? '' : c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterClass === c.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              {c.name} — {c.semester} ({c.section})
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                filterClass === c.id ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {c.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            id="student-search"
            className="input flex-1 min-w-[180px]"
            placeholder="Search by name, ID or email..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {(filterClass || search) && (
            <button
              onClick={() => { handleFilter(''); handleSearch('') }}
              className="btn-secondary text-xs px-3"
            >
              ✕ Clear
            </button>
          )}
        </div>
        {filterClass && (
          <p className="text-xs text-primary-600 font-medium mb-3">
            Showing: {classMap[filterClass]} — {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
        <Table
          columns={columns}
          data={paginated}
          actions={(row) => (
            <>
              <button className="btn-secondary text-xs px-3 py-1" onClick={() => openEdit(row)}>Edit</button>
              <button
                title="Change Password"
                className="text-xs px-3 py-1 rounded-lg font-semibold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                onClick={() => openPwdModal(row)}
              >🔑 Password</button>
              <button className="btn-danger text-xs px-3 py-1" onClick={() => handleDelete(row.id)}>Delete</button>
            </>
          )}
        />

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white
                           text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`d${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                        ${safePage === p
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}>
                      {p}
                    </button>
                  )
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white
                           text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={closeModal} title={editing ? 'Edit Student' : 'Add Student'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class */}
          <FormField label="Class" required error={formErrors.class_id}>
            <select className={fieldClass(formErrors.class_id)} value={form.class_id}
              onChange={e => setForm({ ...form, class_id: e.target.value })}>
              <option value="">— Select Class —</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.semester} ({c.section})</option>
              ))}
            </select>
            {classes.length === 0 && <p className="text-xs text-amber-500 mt-1">No classes found. Add classes first.</p>}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Student ID" required error={formErrors.student_id}>
              <input className={fieldClass(formErrors.student_id)} value={form.student_id}
                placeholder="e.g. STU001"
                onChange={e => setForm({ ...form, student_id: e.target.value })} />
            </FormField>
            <FormField label="Roll Number">
              <input className="input" value={form.roll_number} placeholder="e.g. 1"
                onChange={e => setForm({ ...form, roll_number: e.target.value })} />
            </FormField>
          </div>

          <FormField label="Full Name" required error={formErrors.name}>
            <input className={fieldClass(formErrors.name)} value={form.name}
              placeholder="e.g. Aarav Sharma"
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email" required error={formErrors.email}>
              <input className={fieldClass(formErrors.email)} type="email" value={form.email}
                placeholder="student@email.com"
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label="Phone" error={formErrors.phone} hint="10-digit number">
              <input className={fieldClass(formErrors.phone)} value={form.phone}
                placeholder="9876543210"
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </FormField>
          </div>

          {!editing && (
            <FormField label="Login Password" hint="Leave blank to use Student ID as password">
              <input className="input" type="text" value={form.password}
                placeholder="Leave blank to use Student ID"
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gender">
              <select className="input" value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </FormField>
            <FormField label="Date of Birth">
              <input className="input" type="date" value={form.dob}
                onChange={e => setForm({ ...form, dob: e.target.value })} />
            </FormField>
          </div>

          <FormField label="Address">
            <textarea className="input" rows={2} value={form.address}
              placeholder="Optional"
              onChange={e => setForm({ ...form, address: e.target.value })} />
          </FormField>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
              ⚠ {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editing ? 'Save Changes' : 'Add Student'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!credentials} onClose={() => setCredentials(null)} title="Student Login Credentials">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Share these login details with <strong>{credentials?.name}</strong>:
          </p>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm font-mono">
            <p><span className="text-slate-500">Email:</span> {credentials?.email}</p>
            <p><span className="text-slate-500">Password:</span> {credentials?.password}</p>
          </div>
          <p className="text-xs text-amber-600">
            Save these now — the password is shown only once.
          </p>
          <button className="btn-primary w-full" onClick={() => setCredentials(null)}>Got it</button>
        </div>
      </Modal>

      {/* ── Password Change Modal ── */}
      <Modal isOpen={pwdModal} onClose={closePwdModal} title="Change Login Password">
        <div className="space-y-4">
          {pwdTarget && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
              <p className="text-slate-500 text-xs mb-1">Student</p>
              <p className="font-semibold text-slate-800">{pwdTarget.name}</p>
              <p className="text-slate-500 text-xs mt-0.5">{pwdTarget.email}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 4 characters"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                >{showPwd ? '🙈 Hide' : '👁 Show'}</button>
              </div>
            </div>

            {pwdError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {pwdError}</div>
            )}
            {pwdSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">{pwdSuccess}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary flex-1" disabled={pwdLoading}>
                {pwdLoading ? 'Saving...' : '🔑 Change Password'}
              </button>
              <button type="button" className="btn-secondary" onClick={closePwdModal}>Cancel</button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
