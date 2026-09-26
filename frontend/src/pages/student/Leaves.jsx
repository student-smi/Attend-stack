import { useState, useEffect } from 'react'
import api from '../../api/axios'

const LEAVE_TYPES = ['Sick', 'Casual', 'Emergency', 'Vacation', 'Other']

export default function StudentLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  // Apply Modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    leave_type: 'Sick',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    setLoading(true)
    try {
      const res = await api.get('/leaves/')
      setLeaves(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!form.reason.trim()) {
      alert('Please provide a reason for leave.')
      return
    }
    setSubmitting(true)
    setMsg('')
    try {
      await api.post('/leaves/', form)
      setMsg('✓ Leave application submitted successfully!')
      setForm({
        leave_type: 'Sick',
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        reason: ''
      })
      setShowModal(false)
      fetchLeaves()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit leave application.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) return
    try {
      await api.delete(`/leaves/${id}`)
      fetchLeaves()
    } catch (err) {
      alert('Failed to cancel leave request.')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse'
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-200 text-xs font-semibold mb-3 border border-white/10">
              <span>📝 Chhutti Application</span>
              <span>•</span>
              <span>1-Tap Digital Leave Approval</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Leave Application Portal (छुट्टी की अर्जी)
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-xl">
              Apply for leave directly online with dates and reason. Track approval status in real-time.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/20 hover:shadow-2xl transition-all flex items-center justify-center gap-2 flex-shrink-0"
          >
            <span>➕ Apply For Leave</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <span>🎉</span> {msg}
        </div>
      )}

      {/* Leave History List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📋</span> My Leave Applications History
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
              🏖️
            </div>
            <p className="font-bold text-slate-700">No leave requests found</p>
            <p className="text-xs text-slate-400 mt-1">When you apply for leave, its status will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                  <th className="pb-3 pl-2">Type</th>
                  <th className="pb-3">Dates (From - To)</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Review Remarks</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-2 font-bold text-slate-800">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs border border-slate-200">
                        {l.leave_type}
                      </span>
                    </td>
                    <td className="py-4 text-slate-700 font-medium">
                      <div className="text-xs font-bold text-slate-900">{l.from_date} <span className="text-slate-400">➔</span> {l.to_date}</div>
                    </td>
                    <td className="py-4 text-slate-600 text-xs max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(l.status)}`}>
                        {l.status === 'Pending' ? '🟡 Pending Review' : l.status === 'Approved' ? '🟢 Approved' : '🔴 Rejected'}
                      </span>
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {l.review_remarks || <span className="italic text-slate-300">—</span>}
                    </td>
                    <td className="py-4 text-right pr-2">
                      {l.status === 'Pending' && (
                        <button
                          onClick={() => handleCancelLeave(l.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold">
                  📝
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Apply for Leave</h3>
                  <p className="text-xs text-slate-400">Submit leave dates and details for approval</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Leave Category
                </label>
                <select
                  value={form.leave_type}
                  onChange={e => setForm({ ...form, leave_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  {LEAVE_TYPES.map(t => (
                    <option key={t} value={t}>{t} Leave</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.from_date}
                    onChange={e => setForm({ ...form, from_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.to_date}
                    onChange={e => setForm({ ...form, to_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Reason for Leave (कारण)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Suffering from fever / Family function out of station..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-500/20 transition-all text-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
