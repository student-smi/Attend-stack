import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
  { to: '/admin',            label: 'Dashboard',  icon: '🏠' },
  { to: '/admin/students',   label: 'Students',   icon: '👥' },
  { to: '/admin/classes',    label: 'Classes',    icon: '🏫' },
  { to: '/admin/attendance', label: 'Attendance', icon: '✅' },
  { to: '/admin/exams',      label: 'Exams',      icon: '📝' },
  { to: '/admin/results',    label: 'Results',    icon: '📊' },
  { to: '/admin/fees',       label: 'Fees',       icon: '💰' },
  { to: '/admin/teachers',   label: 'Teachers',   icon: '👨‍🏫' },
  { to: '/admin/subjects',   label: 'Subjects',   icon: '📚' },
  { to: '/admin/timetable',  label: 'Timetable',  icon: '🗓️' },
]

const studentLinks = [
  { to: '/student',            label: 'Dashboard',  icon: '🏠' },
  { to: '/student/attendance', label: 'Attendance', icon: '✅' },
  { to: '/student/exams',      label: 'Exams',      icon: '📝' },
  { to: '/student/results',    label: 'Results',    icon: '📊' },
  { to: '/student/fees',       label: 'Fees',       icon: '💰' },
  { to: '/student/timetable',  label: 'Timetable',  icon: '🗓️' },
  { to: '/student/profile',    label: 'Profile',    icon: '👤' },
]

const teacherLinks = [
  { to: '/teacher',                  label: 'Dashboard',         icon: '🏠' },
  { to: '/teacher?tab=schedule',    label: 'Aaj Ki Classes',    icon: '📅' },
  { to: '/teacher?tab=attendance',  label: 'Take Attendance',   icon: '📝' },
  { to: '/teacher?tab=marks',       label: 'Test Marks Entry',  icon: '🎯' },
  { to: '/teacher?tab=diary',       label: 'Daily Homework',    icon: '📖' },
  { to: '/teacher?tab=alerts',      label: 'Weak Students',     icon: '⚠️' },
  { to: '/teacher?tab=payouts',     label: 'Lecture Counter',   icon: '💼' },
  { to: '/teacher/timetable',       label: 'Full Timetable',    icon: '🗓️' },
]

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  const links = isAdmin ? adminLinks : user?.role === 'teacher' ? teacherLinks : studentLinks

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false) }, [location.pathname, location.search])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isLinkActive = (to) => {
    if (to === '/teacher') {
      return location.pathname === '/teacher' && (!location.search || location.search === '?tab=overview')
    }
    if (to.includes('?tab=')) {
      const tabParam = to.slice(to.indexOf('?tab='))
      return location.pathname === '/teacher' && location.search === tabParam
    }
    return location.pathname === to
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700
                          flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
            C
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">College SMS</p>
            <p className="text-slate-400 text-xs capitalize">{user?.role} Panel</p>
          </div>
        </div>
        {/* Close button - mobile only */}
        <button onClick={() => setOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white text-xl p-1">
          ✕
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon }) => {
          const active = isLinkActive(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-200
                 ${active
                   ? 'bg-primary-600 text-white shadow-md'
                   : 'text-slate-400 hover:bg-dark-800 hover:text-white'
                 }`}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{icon}</span>
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-4 border-t border-dark-700 space-y-1">
        <div className="px-3 py-2 rounded-xl bg-dark-800 mb-2">
          <p className="text-white text-xs font-semibold truncate">{user?.email}</p>
          <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200">
          <span className="w-5 text-center">🚪</span> Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-900 border-b border-dark-700
                      flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700
                          flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <p className="text-white font-bold text-sm">College SMS</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-dark-800 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-dark-900 h-full shadow-2xl animate-slide-in overflow-hidden">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-dark-900 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
