import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'

// Pages
import Login            from './pages/Login'
import AdminDashboard   from './pages/admin/Dashboard'
import Students         from './pages/admin/Students'
import Classes          from './pages/admin/Classes'
import Attendance       from './pages/admin/Attendance'
import Exams            from './pages/admin/Exams'
import Results          from './pages/admin/Results'
import AdminFees        from './pages/admin/Fees'
import Teachers         from './pages/admin/Teachers'
import Subjects         from './pages/admin/Subjects'
import TeacherDashboard   from './pages/teacher/Dashboard'
import TeacherTimetable   from './pages/teacher/Timetable'
import AdminTimetable     from './pages/admin/Timetable'
import StudentTimetable   from './pages/student/Timetable'
import StudentDashboard from './pages/student/Dashboard'
import StudentAttendance from './pages/student/Attendance'
import StudentExams     from './pages/student/Exams'
import StudentResults   from './pages/student/Results'
import StudentFees      from './pages/student/Fees'
import StudentProfile   from './pages/student/Profile'
import StudentQuizzes   from './pages/student/Quizzes'
import StudentLeaves    from './pages/student/Leaves'
import AdminLeaves      from './pages/admin/Leaves'


// ── Full-screen loader ──
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900">
      <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 items-center justify-center text-3xl shadow-xl mb-6 animate-pulse">
        🎓
      </div>
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-slate-400 text-sm mt-4">Loading...</p>
    </div>
  )
}

// ── Protected layout with sidebar ──
function DashboardLayout() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user)   return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  )
}

// ── Redirect by role ──
function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />
  if (user.role === 'admin')   return <Navigate to="/admin"   replace />
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

// ── Admin-only guard ──
function AdminRoute() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/student" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin routes */}
          <Route element={<DashboardLayout />}>
            <Route element={<AdminRoute />}>
              <Route path="/admin"            element={<AdminDashboard />} />
              <Route path="/admin/students"   element={<Students />} />
              <Route path="/admin/classes"    element={<Classes />} />
              <Route path="/admin/attendance" element={<Attendance />} />
              <Route path="/admin/exams"      element={<Exams />} />
              <Route path="/admin/results"    element={<Results />} />
              <Route path="/admin/fees"       element={<AdminFees />} />
              <Route path="/admin/teachers"   element={<Teachers />} />
              <Route path="/admin/subjects"   element={<Subjects />} />
              <Route path="/admin/timetable"  element={<AdminTimetable />} />
              <Route path="/admin/leaves"     element={<AdminLeaves />} />
            </Route>

            {/* Student routes */}
            <Route path="/student"            element={<StudentDashboard />} />
            <Route path="/student/quizzes"    element={<StudentQuizzes />} />
            <Route path="/student/leaves"     element={<StudentLeaves />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/exams"      element={<StudentExams />} />
            <Route path="/student/results"    element={<StudentResults />} />
            <Route path="/student/fees"       element={<StudentFees />} />
            <Route path="/student/profile"    element={<StudentProfile />} />
            <Route path="/student/timetable"  element={<StudentTimetable />} />


            {/* Teacher routes */}
            <Route path="/teacher"             element={<TeacherDashboard />} />
            <Route path="/teacher/timetable"   element={<TeacherTimetable />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
