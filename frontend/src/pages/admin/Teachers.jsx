import { useEffect, useState, useMemo } from 'react'
import api from '../../api/axios'
import Modal from '../../components/Modal'

const EMPTY = {
  name: '', email: '', phone: '', qualification: '',
  specialization: '', address: '', gender: '',
  password: '', subject_id: ''
}
const PAGE_SIZE = 10

export default function Teachers() {
  const [teachers, setTeachers]       = useState([])
  const [subjects, setSubjects]       = useState([])
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [credentials, setCredentials] = useState(null)
  const [page, setPage]               = useState(1)

  // Password change
  const [pwdModal, setPwdModal]     = useState(false)
  const [pwdTarget, setPwdTarget]   = useState(null)
  const [newPwd, setNewPwd]         = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [pwdError, setPwdError]     = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const openPwdModal = (teacher) => {
    setPwdTarget(teacher)
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
      await api.patch(`/teachers/${pwdTarget.id}/change-password`, { new_password: newPwd.trim() })
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
    setLoading(true)
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/teachers/?limit=500'),
        api.get('/subjects/?limit=500'),
      ])
      setTeachers(tRes.data)
      setSubjects(sRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  const openEdit = (t) => {
    setEditing(t)
    setForm({ ...EMPTY, ...t, password: '', subject_id: t.subject_id || '' })
    setError('')
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    const payload = {
      name:           form.name,
      email:          form.email       || null,
      phone:          form.phone       || null,
      qualification:  form.qualification || null,
      address:        form.address     || null,
      gender:         form.gender      || null,
      subject_id:     form.subject_id  || null,
      ...(!editing && { password: form.password || null }),
    }
    try {
      if (editing) {
        await api.put(`/teachers/${editing.id}`, payload)
        if (form.password && form.password.trim()) {
          await api.patch(`/teachers/${editing.id}/change-password`, { new_password: form.password.trim() })
        }
        closeModal(); load()
      } else {
        const res = await api.post('/teachers/', payload)
        closeModal(); load()
        if (res.data.initial_password) {
          setCredentials({ name: res.data.name, email: res.data.email, password: res.data.initial_password })
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Something went wrong.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher?')) return
    await api.delete(`/teachers/${id}`)
    load()
  }

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]))

  const filtered = useMemo(() =>
    teachers.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(search.toLowerCase())
    ), [teachers, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">{teachers.length} teachers registered</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Teacher</button>
      </div>

      <div className="card">
        <input className="input w-full sm:max-w-sm mb-5"
          placeholder="Search by name or email..."
          value={search} onChange={e => handleSearch(e.target.value)} />

        {loading ? (
          <p className="text-gray-400 text-sm py-6 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">
            {teachers.length === 0 ? 'No teachers yet. Add one!' : 'No results found.'}
          </p>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-left px-4 py-3 font-semibold rounded-tl-lg">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Subject</th>
                    <th className="text-left px-4 py-3 font-semibold">Email</th>
                    <th className="text-left px-4 py-3 font-semibold">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold">Login</th>
                    <th className="text-right px-4 py-3 font-semibold rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t, i) => (
                    <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-400">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          {t.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.subject_id && subjectMap[t.subject_id] ? (
                          <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {subjectMap[t.subject_id].name}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{t.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {t.user_id
                          ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">✅ Active</span>
                          : <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-xs">No login</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="btn-secondary text-xs px-3 py-1" onClick={() => openEdit(t)}>Edit</button>
                          <button
                            title="Change Password"
                            className="text-xs px-3 py-1 rounded-lg font-semibold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            onClick={() => openPwdModal(t)}
                          >🔑 Password</button>
                          <button className="btn-danger text-xs px-3 py-1" onClick={() => handleDelete(t.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Card View ── */}
            <div className="sm:hidden space-y-3">
              {paginated.map(t => (
                <div key={t.id} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button className="btn-secondary text-xs px-2.5 py-1" onClick={() => openEdit(t)}>Edit</button>
                      <button
                        title="Change Password"
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                        onClick={() => openPwdModal(t)}
                      >🔑</button>
                      <button className="btn-danger text-xs px-2.5 py-1" onClick={() => handleDelete(t.id)}>Del</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.subject_id && subjectMap[t.subject_id] && (
                      <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        📚 {subjectMap[t.subject_id].name}
                      </span>
                    )}
                    {t.phone && <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs">📞 {t.phone}</span>}
                    {t.user_id
                      ? <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium">✅ Login Active</span>
                      : <span className="bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full text-xs">No Login</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Pagination ── */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-600
                               hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                      acc.push(p); return acc
                    }, [])
                    .map((p, idx) => p === '...'
                      ? <span key={`d${idx}`} className="px-2 text-gray-400">…</span>
                      : <button key={p} onClick={() => setPage(p)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                            ${safePage === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                          {p}
                        </button>
                    )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-600
                               hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modal} onClose={closeModal} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required placeholder="e.g. Ramesh Patel"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="teacher@school.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="9876543210"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          {!editing ? (
            <div>
              <label className="label">Login Password</label>
              <input className="input" type="text" placeholder="Leave blank — auto generated"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <p className="text-xs text-slate-400 mt-1">Required only if email is provided.</p>
            </div>
          ) : (
            <div>
              <label className="label">New Password (Optional)</label>
              <input className="input" type="password" placeholder="Leave blank to keep current password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Assign Subject</label>
            <select className="input" value={form.subject_id}
              onChange={e => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">— No subject assigned —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" placeholder="Optional"
                value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editing ? 'Save Changes' : 'Add Teacher'}</button>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!credentials} onClose={() => setCredentials(null)} title="Teacher Login Credentials">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Share these with <strong>{credentials?.name}</strong>:</p>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm font-mono">
            <p><span className="text-slate-500">Email:</span> {credentials?.email}</p>
            <p><span className="text-slate-500">Password:</span> {credentials?.password}</p>
          </div>
          <p className="text-xs text-amber-600">Save these now — shown only once.</p>
          <button className="btn-primary w-full" onClick={() => setCredentials(null)}>Got it</button>
        </div>
      </Modal>

      {/* ── Password Change Modal ── */}
      <Modal isOpen={pwdModal} onClose={closePwdModal} title="Change Login Password">
        <div className="space-y-4">
          {pwdTarget && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
              <p className="text-slate-500 text-xs mb-1">Teacher</p>
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
