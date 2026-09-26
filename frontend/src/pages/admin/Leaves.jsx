import { useState, useEffect } from 'react'
import api from '../../api/axios'

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Review Modal State
  const [reviewItem, setReviewItem] = useState(null)
  const [reviewAction, setReviewAction] = useState('Approved') // 'Approved' | 'Rejected'
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [processing, setProcessing] = useState(false)

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

  const handleReview = async (e) => {
    e.preventDefault()
    if (!reviewItem) return
    setProcessing(true)
    try {
      await api.put(`/leaves/${reviewItem.id}/review`, {
        status: reviewAction,
        review_remarks: reviewRemarks
      })
      setReviewItem(null)
      setReviewRemarks('')
      fetchLeaves()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update leave status.')
    } finally {
      setProcessing(false)
    }
  }

  const quickApprove = async (leave) => {
    try {
      await api.put(`/leaves/${leave.id}/review`, {
        status: 'Approved',
        review_remarks: 'Approved by Administration'
      })
      fetchLeaves()
    } catch (err) {
      alert('Failed to approve.')
    }
  }

  const filteredLeaves = leaves.filter(l => {
    const matchStatus = filterStatus === 'all' || l.status.toLowerCase() === filterStatus.toLowerCase()
    const matchType = filterType === 'all' || l.applicant_type === filterType
    const applicantName = l.applicant_name || l.reviewer_email || ''
    const matchSearch = applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (l.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (l.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const pendingCount = leaves.filter(l => l.status === 'Pending').length
  const approvedCount = leaves.filter(l => l.status === 'Approved').length
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold mb-3 border border-white/10">
              <span>📬 Administration Inbox</span>
              <span>•</span>
              <span>Student & Teacher Leave Approvals</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Leave Requests & Approvals (छुट्टी की अर्जियां)
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-xl">
              Review, approve, or reject student and teacher leave applications with 1-click status updates and remarks.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-2xl px-5 py-3 text-center">
              <p className="text-xs text-amber-200 font-bold uppercase">Pending</p>
              <p className="text-2xl font-black text-amber-400 mt-0.5">{pendingCount}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-5 py-3 text-center">
              <p className="text-xs text-emerald-200 font-bold uppercase">Approved</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{approvedCount}</p>
            </div>
            <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-2xl px-5 py-3 text-center">
              <p className="text-xs text-red-200 font-bold uppercase">Rejected</p>
              <p className="text-2xl font-black text-red-400 mt-0.5">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {['all', 'pending', 'approved', 'rejected'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st} ({st === 'all' ? leaves.length : leaves.filter(l => l.status.toLowerCase() === st).length})
            </button>
          ))}

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-slate-50"
          >
            <option value="all">All Applicants (Students & Teachers)</option>
            <option value="student">Students Only</option>
            <option value="teacher">Teachers Only</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search by name, roll no or reason..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-2">🏖️</div>
            <p className="font-bold text-slate-700">No leave requests matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                  <th className="pb-3 pl-2">Applicant</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Duration & Dates</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-2">
                      <div className="font-bold text-slate-900 text-sm">{l.applicant_name || 'Anonymous'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                          l.applicant_type === 'teacher' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {l.applicant_type}
                        </span>
                        {l.roll_number && <span>Roll: {l.roll_number}</span>}
                        {l.class_name && <span>• {l.class_name} ({l.class_section})</span>}
                        {l.specialization && <span>• {l.specialization}</span>}
                      </div>
                    </td>

                    <td className="py-4">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                        {l.leave_type}
                      </span>
                    </td>

                    <td className="py-4 text-xs font-semibold text-slate-700">
                      <div className="text-slate-900 font-bold">{l.from_date} ➔ {l.to_date}</div>
                    </td>

                    <td className="py-4 text-xs text-slate-600 max-w-xs">
                      <p className="line-clamp-2" title={l.reason}>{l.reason}</p>
                    </td>

                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        l.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : l.status === 'Rejected'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse'
                      }`}>
                        {l.status}
                      </span>
                    </td>

                    <td className="py-4 text-right pr-2">
                      {l.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => quickApprove(l)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              setReviewItem(l)
                              setReviewAction('Rejected')
                              setReviewRemarks('')
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors border border-red-200"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReviewItem(l)
                            setReviewAction(l.status)
                            setReviewRemarks(l.review_remarks || '')
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors"
                        >
                          Modify / Remarks
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

      {/* Review Remarks Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Review Leave Request</h3>
              <button onClick={() => setReviewItem(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <p><span className="font-bold text-slate-700">Applicant:</span> {reviewItem.applicant_name} ({reviewItem.applicant_type})</p>
              <p><span className="font-bold text-slate-700">Dates:</span> {reviewItem.from_date} to {reviewItem.to_date}</p>
              <p><span className="font-bold text-slate-700">Reason:</span> {reviewItem.reason}</p>
            </div>

            <form onSubmit={handleReview} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status Action</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewAction('Approved')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      reviewAction === 'Approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Approve Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('Rejected')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      reviewAction === 'Rejected'
                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✕ Reject Request
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Remarks / Notes for Applicant (कारण या निर्देश)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Approved. Please complete missed lectures."
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-md"
                >
                  {processing ? 'Saving...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
