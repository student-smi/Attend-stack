import { useEffect, useState } from 'react'
import api from '../../api/axios'
import StatCard from '../../components/StatCard'

export default function StudentDashboard() {
  const [profile, setProfile]       = useState(null)
  const [attendance, setAttendance] = useState([])
  const [exams, setExams]           = useState([])
  const [results, setResults]       = useState([])
  const [diaries, setDiaries]       = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [p, a, e, r, d] = await Promise.all([
          api.get('/students/me').catch(() => ({ data: null })),
          api.get('/attendance/me').catch(() => ({ data: [] })),
          api.get('/exams/my').catch(() => ({ data: [] })),
          api.get('/results/me').catch(() => ({ data: [] })),
          api.get('/diary/my').catch(() => {
            const cached = localStorage.getItem('teacher_cached_diaries')
            return { data: cached ? JSON.parse(cached) : [] }
          }),
        ])
        setProfile(p.data); setAttendance(a.data); setExams(e.data); setResults(r.data); setDiaries(Array.isArray(d.data) ? d.data : [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const presentCount = attendance.filter(a => a.status === 'Present').length
  const attendancePct = attendance.length > 0
    ? Math.round((presentCount / attendance.length) * 100)
    : 0

  const today = new Date().toISOString().split('T')[0]
  const upcomingExams = exams.filter(e => e.exam_date >= today).length

  if (loading) return (
    <div className="p-6 text-center text-gray-400 py-20">Loading your dashboard...</div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Welcome, {profile?.name?.split(' ')[0] || 'Student'} 👋</h1>
        <p className="page-subtitle">Here's your academic overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Attendance" value={`${attendancePct}%`}
          icon="✅" gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          subtitle={`${presentCount}/${attendance.length} classes`} />
        <StatCard title="Upcoming Exams" value={upcomingExams}
          icon="📝" gradient="bg-gradient-to-br from-primary-600 to-primary-800" />
        <StatCard title="Results Available" value={results.length}
          icon="📊" gradient="bg-gradient-to-br from-violet-500 to-purple-700" />
        <StatCard title="Roll Number" value={profile?.roll_number || '—'}
          icon="🎓" gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      {/* 🚀 Quick Actions: Live MCQ Quiz & Leave Application */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/student/quizzes"
          className="p-5 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between shadow-lg shadow-purple-900/20 hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
              ⏱️
            </div>
            <div>
              <h3 className="font-bold text-base">Live Online MCQ Quizzes</h3>
              <p className="text-xs text-purple-200">Attempt speed tests with live countdown timers & instant results</p>
            </div>
          </div>
          <span className="text-lg font-bold">➔</span>
        </a>

        <a
          href="/student/leaves"
          className="p-5 rounded-3xl bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shadow-lg shadow-teal-900/20 hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
              📝
            </div>
            <div>
              <h3 className="font-bold text-base">Apply for Leave</h3>
              <p className="text-xs text-teal-200">Submit leave dates & track approval status in real-time</p>
            </div>
          </div>
          <span className="text-lg font-bold">➔</span>
        </a>
      </div>


      {/* 📖 Daily Homework & Class Diary */}
      <div className="card p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-white border border-indigo-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-indigo-100/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Daily Homework & Class Diary
              </h2>
              <p className="text-xs text-gray-500">
                Latest classwork, topics covered, and assignments posted by your teachers.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
            {diaries.length} Entries
          </span>
        </div>

        {diaries.length === 0 ? (
          <div className="text-center py-6 text-gray-400 space-y-1">
            <p className="text-xs font-semibold text-gray-600">No homework or class diary posted yet for your class.</p>
            <p className="text-[11px] text-gray-400">Check back after your daily lectures!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diaries.slice(0, 4).map(d => (
              <div key={d.id} className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                    {d.subject_name || 'Subject'}
                  </span>
                  <span className="text-gray-400 font-medium">📅 {d.date}</span>
                </div>
                <div>
                  <strong className="text-xs text-gray-900 block font-bold">Topics Covered:</strong>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{d.topics_covered}</p>
                </div>
                {d.homework && (
                  <div className="pt-2 border-t border-gray-100">
                    <strong className="text-xs text-amber-800 block font-bold">Homework Given:</strong>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{d.homework}</p>
                    {d.due_date && (
                      <p className="text-[11px] text-amber-600 font-bold mt-1">⏰ Due Date: {d.due_date}</p>
                    )}
                  </div>
                )}
                {d.teacher_name && (
                  <p className="text-[11px] text-gray-400 pt-1">Posted by: {d.teacher_name}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile card */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">My Profile</h2>
          <div className="space-y-2">
            {[
              ['Student ID', profile?.student_id],
              ['Email',      profile?.email],
              ['Phone',      profile?.phone],
              ['Gender',     profile?.gender],
              ['Date of Birth', profile?.dob],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                <span className="text-gray-700 font-medium">{val || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent results */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">Recent Results</h2>
          {results.length === 0 ? (
            <p className="text-gray-400 text-sm">No results yet.</p>
          ) : (
            <div className="space-y-2">
              {results.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm
                                           p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-gray-600">{r.exam_name || r.exam_id}</span>
                  <span className="font-bold text-primary-600">{r.marks} marks • {r.grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
