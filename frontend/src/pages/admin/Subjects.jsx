import { useEffect, useState } from 'react'
import api from '../../api/axios'
import Modal from '../../components/Modal'
import { FormField, fieldClass, validators, validate } from '../../components/FormField'

const EMPTY = { name: '', code: '', description: '' }

// Simple color from subject name for badge
const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]
const colorFor = (name) => COLORS[name.charCodeAt(0) % COLORS.length]

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [error, setError]           = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/subjects/?limit=500')
      setSubjects(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setError(''); setFormErrors({}); setModal(true) }
  const openEdit = (s) => { setEditing(s); setForm({ ...EMPTY, ...s }); setError(''); setFormErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null); setFormErrors({}) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    const errs = validate({
      name: [validators.required(form.name, 'Subject Name')],
    })
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setFormErrors({})
    const payload = {
      name:        form.name,
      code:        form.code        || null,
      description: form.description || null,
    }
    try {
      if (editing) {
        await api.put(`/subjects/${editing.id}`, payload)
      } else {
        await api.post('/subjects/', payload)
      }
      closeModal(); load()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Something went wrong.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return
    await api.delete(`/subjects/${id}`)
    load()
  }

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">{subjects.length} subjects added</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Subject</button>
      </div>

      {/* Subject Cards Grid */}
      <div className="card">
        <input
          className="input max-w-sm mb-5"
          placeholder="Search by name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="text-gray-400 text-sm py-6 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">
            {subjects.length === 0 ? 'No subjects yet. Add one!' : 'No results found.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(s => (
              <div
                key={s.id}
                className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
              >
                {/* Icon + code */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${colorFor(s.name)}`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  {s.code && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                      {s.code}
                    </span>
                  )}
                </div>

                {/* Name */}
                <p className="font-semibold text-gray-800 text-sm mb-1">{s.name}</p>

                {/* Description */}
                {s.description ? (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">{s.description}</p>
                ) : (
                  <p className="text-xs text-gray-300 mb-3">No description</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    className="btn-secondary text-xs px-3 py-1 flex-1"
                    onClick={() => openEdit(s)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger text-xs px-3 py-1"
                    onClick={() => handleDelete(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={closeModal} title={editing ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Subject Name" required error={formErrors.name}>
            <input className={fieldClass(formErrors.name)} placeholder="e.g. Mathematics"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Subject Code" hint="Optional — must be unique">
            <input className="input" placeholder="e.g. MATH101"
              value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <textarea className="input" rows={3} placeholder="Brief description of the subject..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </FormField>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editing ? 'Save Changes' : 'Add Subject'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
