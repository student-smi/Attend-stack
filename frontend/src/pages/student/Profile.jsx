import { useEffect, useState } from 'react'
import api from '../../api/axios'
import Modal from '../../components/Modal'

export default function StudentProfile() {
  const [profile, setProfile] = useState(null)

  // Password change state
  const [pwdModal, setPwdModal]     = useState(false)
  const [oldPwd, setOldPwd]         = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [pwdError, setPwdError]     = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    api.get('/students/me').then(r => setProfile(r.data)).catch(() => {})
  }, [])

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdError(''); setPwdSuccess('')
    if (!oldPwd) { setPwdError('Please enter your current password.'); return }
    if (!newPwd || newPwd.trim().length < 4) {
      setPwdError('New password must be at least 4 characters.')
      return
    }
    setPwdLoading(true)
    try {
      await api.post('/auth/change-password', {
        old_password: oldPwd,
        new_password: newPwd.trim()
      })
      setPwdSuccess('✅ Password changed successfully!')
      setOldPwd(''); setNewPwd('')
    } catch (err) {
      setPwdError(err.response?.data?.detail || 'Failed to change password.')
    } finally {
      setPwdLoading(false)
    }
  }

  if (!profile) return (
    <div className="p-6 text-center text-gray-400 py-20">Loading profile...</div>
  )

  const fields = [
    ['Student ID',   profile.student_id],
    ['Full Name',    profile.name],
    ['Email',        profile.email],
    ['Phone',        profile.phone],
    ['Gender',       profile.gender],
    ['Date of Birth',profile.dob],
    ['Roll Number',  profile.roll_number],
    ['Address',      profile.address],
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title">My Profile</h1>
        <button
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100"
          onClick={() => { setPwdModal(true); setPwdError(''); setPwdSuccess(''); setOldPwd(''); setNewPwd('') }}
        >
          🔑 Change Password
        </button>
      </div>

      <div className="card max-w-xl">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700
                          flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {profile.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{profile.name}</p>
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">
                {label}
              </span>
              <span className="text-sm text-gray-700 font-medium">{value || '—'}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-300 text-center">
            To update profile details, contact the Admin.
          </p>
        </div>
      </div>

      {/* ── Password Change Modal ── */}
      <Modal isOpen={pwdModal} onClose={() => setPwdModal(false)} title="Change My Password">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              placeholder="Enter current password"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
            />
          </div>

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
              {pwdLoading ? 'Saving...' : '🔑 Update Password'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPwdModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

