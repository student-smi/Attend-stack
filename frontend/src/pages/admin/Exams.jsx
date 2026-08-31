import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { FormField, fieldClass, validators, validate } from '../../components/FormField'

const EMPTY = { name: '', subject: '', exam_date: '', max_marks: 100 }

export default function Exams() {
  const [classes, setClasses]       = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [exams, setExams]           = useState([])
  const [loading, setLoading]       = useState(false)

  // Add exam form
  const [form, setForm]             = useState(EMPTY)
  const [formError, setFormError]   = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg]   = useState('')

  // Edit state
  const [editingId, setEditingId]   = useState(null)
  const [editForm, setEditForm]     = useState({})

  const today = new Date().toISOString().split('T')[0]

  // Load classes on mount
  useEffect(() => {
    api.get('/classes/?limit=1000').then(r => setClasses(r.data))
  }, [])

  // When class changes → load exams for that class
  useEffect(() => {
    if (!selectedClass) { setExams([]); return }
    loadExams()
  }, [selectedClass])

  const loadExams = async () => {
    if (!selectedClass) return
    setLoading(true)
    try {
      const res = await api.get('/exams/?limit=1000')
      const filtered = res.data.filter(e => e.class_id === selectedClass)
      setExams(filtered.sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
    } finally {
      setLoading(false)
    }
  }

  const handleAddExam = async (e) => {
    e.preventDefault()
    setFormError(''); setSubmitMsg('')

    const errs = validate({
      name:      [validators.required(form.name, 'Exam Name')],
      subject:   [validators.required(form.subject, 'Subject')],
      exam_date: [validators.required(form.exam_date, 'Exam Date')],
      max_marks: [!form.max_marks || form.max_marks < 1 ? 'Max Marks must be at least 1' : null],
    })
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setFormErrors({})
    setSubmitting(true)
    try {
      await api.post('/exams/', {
        ...form,
        max_marks: parseInt(form.max_marks),
        class_id: selectedClass || null,
      })
      setForm(EMPTY)
      setSubmitMsg('✅ Exam added successfully!')
      loadExams()
    } catch (err) {
      const detail = err.response?.data?.detail
      setFormError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Error adding exam.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exam?')) return
    await api.delete(`/exams/${id}`)
    loadExams()
  }

  const startEdit = (exam) => {
    setEditingId(exam.id)
    setEditForm({
      name: exam.name,
      subject: exam.subject,
      exam_date: exam.exam_date,
      max_marks: exam.max_marks,
    })
  }

  const saveEdit = async (id) => {
    await api.put(`/exams/${id}`, {
      ...editForm,
      max_marks: parseInt(editForm.max_marks),
    })
    setEditingId(null)
    loadExams()
  }

  const selectedClassName = classes.find(c => c.id === selectedClass)
  const classLabel = selectedClassName
    ? `${selectedClassName.name} — ${selectedClassName.semester} (${selectedClassName.section})`
    : ''

  const upcoming = exams.filter(e => e.exam_date >= today)
  const past     = exams.filter(e => e.exam_date < today)

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Exams</h1>
        <p className="page-subtitle">Select a class to manage its exams</p>
      </div>

      {/* ── Step 1: Select Class ── */}
      <div className="card">
        <h2 className="font-bold text-gray-800 text-base mb-4 pb-2 border-b border-gray-100">
          Select Class
        </h2>
        <div>
          <label className="label">Current Class:</label>
          <select
            className="input max-w-md"
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value); setSubmitMsg(''); setFormError('') }}
          >
            <option value="">— Choose a class —</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.semester} ({c.section})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Step 2: Add Exam ── */}
      {selectedClass && (
        <div className="card">
          <h2 className="font-bold text-gray-800 text-base mb-4 pb-2 border-b border-gray-100">
            Add Exam
          </h2>
          <form onSubmit={handleAddExam} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Exam Name" required error={formErrors.name}>
                <input className={fieldClass(formErrors.name)} placeholder="Mid-Term Exam"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Subject" required error={formErrors.subject}>
                <input className={fieldClass(formErrors.subject)} placeholder="Mathematics"
                  value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </FormField>
              <FormField label="Exam Date" required error={formErrors.exam_date}>
                <input className={fieldClass(formErrors.exam_date)} type="date"
                  value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} />
              </FormField>
              <FormField label="Max Marks" required error={formErrors.max_marks}>
                <input className={fieldClass(formErrors.max_marks)} type="number" min="1"
                  value={form.max_marks} onChange={e => setForm({ ...form, max_marks: e.target.value })} />
              </FormField>
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {formError}</div>
            )}
            {submitMsg && <p className="text-emerald-600 text-sm font-medium">{submitMsg}</p>}
            <button type="submit" disabled={submitting}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? 'Adding...' : '+ Add Exam'}
            </button>
          </form>
        </div>
      )}

      {/* ── Step 3: Exam List ── */}
      {selectedClass && !loading && exams.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-800 text-base mb-4 pb-2 border-b border-gray-100">
            Exam Schedule — {classLabel}
          </h2>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                Upcoming ({upcoming.length})
              </p>
              <div className="space-y-2">
                {upcoming.map((exam, i) => (
                  <ExamRow
                    key={exam.id}
                    exam={exam}
                    index={i}
                    isUpcoming
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    cancelEdit={() => setEditingId(null)}
                    handleDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Past ({past.length})
              </p>
              <div className="space-y-2">
                {past.map((exam, i) => (
                  <ExamRow
                    key={exam.id}
                    exam={exam}
                    index={i}
                    isUpcoming={false}
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    cancelEdit={() => setEditingId(null)}
                    handleDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedClass && !loading && exams.length === 0 && (
        <div className="card text-center text-gray-400 py-8 text-sm">
          No exams scheduled for this class yet. Add one above.
        </div>
      )}

      {selectedClass && loading && (
        <div className="card text-center text-gray-400 py-8 text-sm">
          Loading exams...
        </div>
      )}
    </div>
  )
}

// ── Single Exam Row Component ──
function ExamRow({ exam, index, isUpcoming, editingId, editForm, setEditForm, startEdit, saveEdit, cancelEdit, handleDelete }) {
  const isEditing = editingId === exam.id

  return (
    <div className={`rounded-lg border ${isUpcoming ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-gray-50/40'}`}>
      {isEditing ? (
        // Edit mode
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Exam Name</label>
              <input className="input text-sm py-2" value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input text-sm py-2" value={editForm.subject}
                onChange={e => setEditForm({ ...editForm, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input text-sm py-2" type="date" value={editForm.exam_date}
                onChange={e => setEditForm({ ...editForm, exam_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input className="input text-sm py-2" type="number" min="1" value={editForm.max_marks}
                onChange={e => setEditForm({ ...editForm, max_marks: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveEdit(exam.id)} className="btn-primary text-xs px-4 py-1.5">Save</button>
            <button onClick={cancelEdit} className="btn-secondary text-xs px-4 py-1.5">Cancel</button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white
              ${isUpcoming ? 'bg-emerald-500' : 'bg-gray-400'}`}>
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{exam.name}</p>
              <p className="text-xs text-gray-500">{exam.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center hidden sm:block">
              <p className="text-xs text-gray-400">Date</p>
              <p className={`text-sm font-medium ${isUpcoming ? 'text-emerald-600' : 'text-gray-400'}`}>
                {exam.exam_date}
              </p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs text-gray-400">Max Marks</p>
              <p className="text-sm font-semibold text-gray-700">{exam.max_marks}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(exam)} className="btn-secondary text-xs px-3 py-1">Edit</button>
              <button onClick={() => handleDelete(exam.id)} className="btn-danger text-xs px-3 py-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
