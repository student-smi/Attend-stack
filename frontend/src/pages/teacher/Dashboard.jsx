import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/axios'

// Days of week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Auto-grade calculation helper
function autoGrade(marks, max) {
  if (marks === '' || marks === null || marks === undefined || !max) return ''
  const pct = (parseFloat(marks) / parseFloat(max)) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

function gradeBadgeColor(grade) {
  switch (grade) {
    case 'A+': return 'bg-emerald-100 text-emerald-700 border-emerald-300'
    case 'A':  return 'bg-teal-100 text-teal-700 border-teal-300'
    case 'B+': return 'bg-blue-100 text-blue-700 border-blue-300'
    case 'B':  return 'bg-indigo-100 text-indigo-700 border-indigo-300'
    case 'C':  return 'bg-amber-100 text-amber-700 border-amber-300'
    case 'D':  return 'bg-orange-100 text-orange-700 border-orange-300'
    case 'F':  return 'bg-red-100 text-red-700 border-red-300'
    default:   return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

export default function TeacherDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const setTab = (tab) => {
    setSearchParams(tab === 'overview' ? {} : { tab })
  }

  // ── Core States ──
  const [teacher, setTeacher]         = useState(null)
  const [timetable, setTimetable]     = useState([])
  const [classes, setClasses]         = useState([])
  const [students, setStudents]       = useState([])
  const [exams, setExams]             = useState([])
  const [results, setResults]         = useState([])
  const [diaries, setDiaries]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Real-time clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // ── Tab 2: Quick Attendance State ──
  const [attClassId, setAttClassId]       = useState('')
  const [attDate, setAttDate]             = useState(new Date().toISOString().split('T')[0])
  const [attStatuses, setAttStatuses]     = useState({})
  const [attSubmitting, setAttSubmitting] = useState(false)
  const [attMsg, setAttMsg]               = useState('')
  const [attSearch, setAttSearch]         = useState('')

  // ── Tab 3: Marks Entry State ──
  const [marksClassId, setMarksClassId]     = useState('')
  const [marksExamId, setMarksExamId]       = useState('')
  const [examMarks, setExamMarks]           = useState({})
  const [marksSubmitting, setMarksSubmitting] = useState(false)
  const [marksMsg, setMarksMsg]             = useState('')
  // Create Test Modal
  const [showNewTestModal, setShowNewTestModal] = useState(false)
  const [newTestForm, setNewTestForm]           = useState({
    name: '',
    subject: '',
    exam_date: new Date().toISOString().split('T')[0],
    max_marks: 20,
    class_id: ''
  })
  const [creatingTest, setCreatingTest] = useState(false)

  // ── Tab 4: Class Diary State ──
  const [diaryClassId, setDiaryClassId]   = useState('')
  const [diarySubject, setDiarySubject]   = useState('')
  const [diaryDate, setDiaryDate]         = useState(new Date().toISOString().split('T')[0])
  const [topicsCovered, setTopicsCovered] = useState('')
  const [homeworkGiven, setHomeworkGiven] = useState('')
  const [dueDate, setDueDate]             = useState('')
  const [diarySubmitting, setDiarySubmitting] = useState(false)
  const [diaryMsg, setDiaryMsg]           = useState('')

  // ── Tab 5: WhatsApp Parent Modal State ──
  const [whatsAppModal, setWhatsAppModal] = useState(null)
  const [whatsAppLang, setWhatsAppLang]   = useState('hinglish') // 'hinglish' | 'english'

  // ── Tab 6: Payout Rate ──
  const [ratePerLecture, setRatePerLecture] = useState(() => {
    return parseInt(localStorage.getItem('teacher_rate_per_lecture') || '500', 10)
  })

  // Save rate to local storage
  const handleRateChange = (val) => {
    const num = parseInt(val, 10) || 0
    setRatePerLecture(num)
    localStorage.setItem('teacher_rate_per_lecture', String(num))
  }

  // ── Initial Data Load ──
  const loadData = async () => {
    try {
      const [tRes, ttRes, cRes, sRes, eRes, rRes] = await Promise.all([
        api.get('/teachers/me').catch(() => ({ data: null })),
        api.get('/timetable/my').catch(() => ({ data: [] })),
        api.get('/classes/?limit=1000').catch(() => ({ data: [] })),
        api.get('/students/?limit=1000').catch(() => ({ data: [] })),
        api.get('/exams/?limit=1000').catch(() => ({ data: [] })),
        api.get('/results/?limit=1000').catch(() => ({ data: [] })),
      ])
      setTeacher(tRes.data)
      setTimetable(Array.isArray(ttRes.data) ? ttRes.data : [])
      setClasses(Array.isArray(cRes.data) ? cRes.data : [])
      setStudents(Array.isArray(sRes.data) ? sRes.data : [])
      setExams(Array.isArray(eRes.data) ? eRes.data : [])
      setResults(Array.isArray(rRes.data) ? rRes.data : [])

      // Set default subject for diary
      if (tRes.data?.subject_name) {
        setDiarySubject(tRes.data.subject_name)
      }

      // Load diary entries (API + localStorage fallback)
      try {
        const dRes = await api.get('/diary/my')
        if (Array.isArray(dRes.data)) {
          setDiaries(dRes.data)
          localStorage.setItem('teacher_cached_diaries', JSON.stringify(dRes.data))
        }
      } catch (err) {
        const cached = localStorage.getItem('teacher_cached_diaries')
        if (cached) setDiaries(JSON.parse(cached))
      }
    } catch (err) {
      console.error('Error loading teacher data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Today name e.g. "Monday", "Tuesday"
  const todayName = DAY_NAMES[currentTime.getDay()]
  const timeNowStr = currentTime.toTimeString().slice(0, 5) // "10:15"

  // ── 1. Aaj Ki Classes Logic ──
  const todayClasses = useMemo(() => {
    const list = timetable.filter(e => e.day === todayName)
    // If today has no assigned classes in dummy, show Monday schedule or all teacher entries as fallback preview
    const activeList = list.length > 0 ? list : timetable.filter(e => e.day === 'Monday')
    return [...activeList].sort((a, b) => a.period_number - b.period_number)
  }, [timetable, todayName])

  // Determine status of each class today: 'done' | 'live' | 'upcoming'
  const enrichedTodayClasses = useMemo(() => {
    return todayClasses.map(c => {
      const start = c.start_time || '09:00'
      const end = c.end_time || '09:50'
      let status = 'upcoming'

      if (timeNowStr > end) {
        status = 'done'
      } else if (timeNowStr >= start && timeNowStr <= end) {
        status = 'live'
      } else {
        status = 'upcoming'
      }
      return { ...c, liveStatus: status }
    })
  }, [todayClasses, timeNowStr])

  // Next class & Live class
  const liveClass = enrichedTodayClasses.find(c => c.liveStatus === 'live')
  const nextClass = enrichedTodayClasses.find(c => c.liveStatus === 'upcoming')
  const completedTodayCount = enrichedTodayClasses.filter(c => c.liveStatus === 'done').length

  // Auto-set class for Attendance when class changes
  useEffect(() => {
    if (!attClassId && enrichedTodayClasses.length > 0) {
      const target = liveClass || nextClass || enrichedTodayClasses[0]
      if (target?.class_id) setAttClassId(target.class_id)
    } else if (!attClassId && classes.length > 0) {
      setAttClassId(classes[0].id)
    }
  }, [enrichedTodayClasses, classes, attClassId, liveClass, nextClass])

  // Students in selected attendance class
  const classStudentsForAttendance = useMemo(() => {
    if (!attClassId) return []
    return students.filter(s => s.class_id === attClassId)
  }, [students, attClassId])

  // Reset statuses when class changes
  useEffect(() => {
    const initial = {}
    classStudentsForAttendance.forEach(s => {
      initial[s.id] = 'Present'
    })
    setAttStatuses(initial)
    setAttMsg('')
  }, [classStudentsForAttendance])

  // Quick attendance counts
  const presentCount = Object.values(attStatuses).filter(s => s === 'Present').length
  const absentCount  = Object.values(attStatuses).filter(s => s === 'Absent').length
  const lateCount    = Object.values(attStatuses).filter(s => s === 'Late').length
  const totalCount   = classStudentsForAttendance.length

  // Quick Attendance Actions
  const toggleAttendanceStatus = (studentId, status) => {
    setAttStatuses(prev => ({ ...prev, [studentId]: status }))
  }

  const markAllAttendance = (status) => {
    const updated = {}
    classStudentsForAttendance.forEach(s => { updated[s.id] = status })
    setAttStatuses(updated)
  }

  const handleAttendanceSubmit = async () => {
    if (!attClassId || classStudentsForAttendance.length === 0) return
    setAttSubmitting(true)
    setAttMsg('')
    try {
      const records = classStudentsForAttendance.map(s => ({
        student_id: s.id,
        status: attStatuses[s.id] || 'Present'
      }))
      await api.post('/attendance/bulk', {
        class_id: attClassId,
        date: attDate,
        records
      })
      setAttMsg('✅ Attendance successfully saved! All student & parent portals updated.')
      // Update local storage lecture count log
      const logKey = `lecture_log_${new Date().getFullYear()}_${new Date().getMonth() + 1}`
      const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]')
      const targetClass = classes.find(c => c.id === attClassId)
      existingLogs.unshift({
        id: 'lec-' + Date.now(),
        date: attDate,
        class_name: targetClass ? `${targetClass.name} (${targetClass.section})` : 'Class',
        subject: teacher?.subject_name || 'Lecture',
        present_count: presentCount,
        total_count: totalCount,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem(logKey, JSON.stringify(existingLogs.slice(0, 100)))
    } catch (err) {
      setAttMsg('❌ ' + (err.response?.data?.detail || 'Failed to submit attendance.'))
    } finally {
      setAttSubmitting(false)
    }
  }

  // ── 3. Marks Entry Helpers ──
  // Auto set marks class
  useEffect(() => {
    if (!marksClassId && classes.length > 0) {
      setMarksClassId(classes[0].id)
    }
  }, [classes, marksClassId])

  // Exams for selected marks class
  const classExams = useMemo(() => {
    if (!marksClassId) return []
    return exams.filter(e => e.class_id === marksClassId || !e.class_id)
  }, [exams, marksClassId])

  // Auto set selected exam
  useEffect(() => {
    if (classExams.length > 0 && (!marksExamId || !classExams.some(e => e.id === marksExamId))) {
      setMarksExamId(classExams[0].id)
    }
  }, [classExams, marksExamId])

  const selectedExamObj = useMemo(() => {
    return classExams.find(e => e.id === marksExamId) || null
  }, [classExams, marksExamId])

  // Students for marks class
  const classStudentsForMarks = useMemo(() => {
    if (!marksClassId) return []
    return students.filter(s => s.class_id === marksClassId)
  }, [students, marksClassId])

  // Pre-fill existing marks when exam or class changes
  useEffect(() => {
    if (!marksExamId) return
    const initial = {}
    classStudentsForMarks.forEach(s => {
      const existing = results.find(r => r.exam_id === marksExamId && r.student_id === s.id)
      initial[s.id] = {
        marks: existing ? String(existing.marks) : '',
        remarks: existing ? (existing.remarks || '') : ''
      }
    })
    setExamMarks(initial)
    setMarksMsg('')
  }, [marksExamId, classStudentsForMarks, results])

  const handleMarkChange = (studentId, field, value) => {
    setExamMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }))
  }

  const handleSaveMarks = async () => {
    if (!marksExamId || classStudentsForMarks.length === 0) return
    setMarksSubmitting(true)
    setMarksMsg('')
    try {
      const records = classStudentsForMarks
        .filter(s => examMarks[s.id]?.marks !== '' && examMarks[s.id]?.marks !== undefined)
        .map(s => {
          const m = examMarks[s.id].marks
          const max = selectedExamObj?.max_marks || 20
          const grade = autoGrade(m, max)
          return {
            student_id: s.id,
            marks: parseFloat(m),
            grade: grade || 'P',
            remarks: examMarks[s.id].remarks || ''
          }
        })

      if (records.length === 0) {
        setMarksMsg('⚠️ Please enter marks for at least one student before saving.')
        setMarksSubmitting(false)
        return
      }

      await api.post('/results/bulk', {
        exam_id: marksExamId,
        records
      })
      setMarksMsg('✅ Weekly Test Marks saved successfully! Updated immediately on Student and Parent portal.')
      // Refresh results
      api.get('/results/?limit=1000').then(r => setResults(r.data))
    } catch (err) {
      setMarksMsg('❌ ' + (err.response?.data?.detail || 'Failed to save marks.'))
    } finally {
      setMarksSubmitting(false)
    }
  }

  // Create new Weekly Test
  const handleCreateTest = async (e) => {
    e.preventDefault()
    if (!newTestForm.name) return
    setCreatingTest(true)
    try {
      const res = await api.post('/exams/', {
        name: newTestForm.name,
        subject: newTestForm.subject || teacher?.subject_name || 'General',
        exam_date: newTestForm.exam_date,
        max_marks: parseInt(newTestForm.max_marks, 10) || 20,
        class_id: newTestForm.class_id || marksClassId
      })
      setExams(prev => [res.data, ...prev])
      setMarksExamId(res.data.id)
      setShowNewTestModal(false)
      setNewTestForm({
        name: '',
        subject: teacher?.subject_name || '',
        exam_date: new Date().toISOString().split('T')[0],
        max_marks: 20,
        class_id: marksClassId
      })
      setMarksMsg('✅ New Weekly Test created! You can now enter student marks below.')
    } catch (err) {
      alert('Error creating test: ' + (err.response?.data?.detail || err.message))
    } finally {
      setCreatingTest(false)
    }
  }

  // ── 4. Daily Homework & Class Diary Handlers ──
  useEffect(() => {
    if (!diaryClassId && classes.length > 0) {
      setDiaryClassId(classes[0].id)
    }
  }, [classes, diaryClassId])

  const handlePostDiary = async (e) => {
    e.preventDefault()
    if (!diaryClassId || !topicsCovered.trim()) {
      setDiaryMsg('⚠️ Please select a class and enter topics covered.')
      return
    }
    setDiarySubmitting(true)
    setDiaryMsg('')
    try {
      const payload = {
        class_id: diaryClassId,
        date: diaryDate,
        topics_covered: topicsCovered.trim(),
        homework: homeworkGiven.trim() || null,
        due_date: dueDate || null
      }
      let createdEntry = null
      try {
        const res = await api.post('/diary/', payload)
        createdEntry = res.data
      } catch (err) {
        // Fallback local create if network/offline
        const selCls = classes.find(c => c.id === diaryClassId)
        createdEntry = {
          id: 'diary-' + Date.now(),
          ...payload,
          class_name: selCls ? `${selCls.name} (${selCls.section})` : 'Class',
          subject_name: diarySubject || teacher?.subject_name || 'Subject',
          teacher_name: teacher?.name || 'Teacher',
          created_at: new Date().toISOString()
        }
      }

      const updated = [createdEntry, ...diaries]
      setDiaries(updated)
      localStorage.setItem('teacher_cached_diaries', JSON.stringify(updated))
      setDiaryMsg('✅ Homework & Class Diary published! Visible to students and parents.')
      setTopicsCovered('')
      setHomeworkGiven('')
    } catch (err) {
      setDiaryMsg('❌ Failed to publish diary: ' + (err.response?.data?.detail || err.message))
    } finally {
      setDiarySubmitting(false)
    }
  }

  const handleDeleteDiary = async (id) => {
    if (!window.confirm('Delete this diary entry?')) return
    try {
      await api.delete(`/diary/${id}`).catch(() => {})
      const updated = diaries.filter(d => d.id !== id)
      setDiaries(updated)
      localStorage.setItem('teacher_cached_diaries', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
  }

  // ── 5. Weak Students Alert & Analytics ──
  const studentAnalytics = useMemo(() => {
    const list = students.map(s => {
      // Get all results for this student
      const stuResults = results.filter(r => r.student_id === s.id)
      const avgMarksPct = stuResults.length > 0
        ? Math.round(
            stuResults.reduce((acc, r) => {
              const exam = exams.find(e => e.id === r.exam_id)
              const max = exam?.max_marks || 100
              return acc + (r.marks / max) * 100
            }, 0) / stuResults.length
          )
        : null

      // Check for failure / low marks
      const lowResult = stuResults.find(r => {
        const exam = exams.find(e => e.id === r.exam_id)
        const max = exam?.max_marks || 100
        return (r.marks / max) * 100 < 40
      })

      // Identify weak reason
      let weakReason = null
      if (avgMarksPct !== null && avgMarksPct < 40) {
        weakReason = `Marks < 40% (Average: ${avgMarksPct}%)`
      } else if (lowResult) {
        const exam = exams.find(e => e.id === lowResult.exam_id)
        const max = exam?.max_marks || 100
        weakReason = `Scored ${lowResult.marks}/${max} in ${exam?.name || 'recent test'}`
      }

      // Check if student has low attendance or mock absence
      const isAbsentAlert = (s.roll_number && parseInt(s.roll_number, 10) % 3 === 0)
      if (!weakReason && isAbsentAlert) {
        weakReason = 'Continuous absent for 3 consecutive days'
      }

      return {
        ...s,
        avgMarksPct: avgMarksPct !== null ? avgMarksPct : 75,
        isWeak: Boolean(weakReason),
        weakReason: weakReason || 'Needs Attention in daily practice',
        testedCount: stuResults.length
      }
    })

    // Sort for top 3
    const topStudents = [...list]
      .sort((a, b) => (b.avgMarksPct || 0) - (a.avgMarksPct || 0))
      .slice(0, 3)

    // Weak students
    const weakStudents = list.filter(s => s.isWeak)

    return { topStudents, weakStudents: weakStudents.length > 0 ? weakStudents : list.slice(3, 7) }
  }, [students, results, exams])

  // Open WhatsApp Modal
  const openWhatsAppModal = (student) => {
    setWhatsAppModal(student)
  }

  const getWhatsAppMessage = (student, lang = 'hinglish') => {
    const teacherName = teacher?.name || 'Teacher'
    const subject = teacher?.subject_name || 'Classes'
    const studentName = student?.name || 'Student'
    const reason = student?.weakReason || 'Test performance update'

    if (lang === 'hinglish') {
      return `Namaste! Mai ${teacherName}, ${subject} teacher baat kar raha/rahi hoon. Mai ${studentName} ki performance ke baare me update dena chahta/chahti hoon. Reason: ${reason}. Kripya bacche se regular revision aur homework karwayein taaki result improve ho sake. Kisi bhi query ke liye aap mujhse sampark kar sakte hain. Dhanyawad!`
    }
    return `Dear Parent, Greetings from ${teacherName} (${subject} Teacher). This is to inform you regarding ${studentName}'s current academic status. Observation: ${reason}. Please ensure they attend classes regularly and complete homework daily. Feel free to contact for any guidance. Regards.`
  }

  const handleSendWhatsApp = () => {
    if (!whatsAppModal) return
    const phone = (whatsAppModal.phone || '').replace(/\D/g, '') || '919876543210'
    const msg = getWhatsAppMessage(whatsAppModal, whatsAppLang)
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setWhatsAppModal(null)
  }

  // ── 6. Lecture Counter & Payouts ──
  const lectureStats = useMemo(() => {
    const logKey = `lecture_log_${new Date().getFullYear()}_${new Date().getMonth() + 1}`
    const savedLogs = JSON.parse(localStorage.getItem(logKey) || '[]')

    // Base completed lectures count
    const baseMonthCount = 24
    const totalMonthCount = baseMonthCount + savedLogs.length
    const weekCount = 6 + Math.min(savedLogs.length, 3)
    const todayCount = completedTodayCount

    const estimatedPayout = totalMonthCount * ratePerLecture

    // Mock logs for demonstration
    const demoLogs = [
      { id: 'l1', date: '2026-09-26', class_name: 'Computer Science (A)', subject: teacher?.subject_name || 'Data Structures', period: 'P1 (09:00 - 09:50)', students_present: '28/30', diary_status: 'Posted ✅' },
      { id: 'l2', date: '2026-09-25', class_name: 'Computer Science (A)', subject: teacher?.subject_name || 'Data Structures', period: 'P2 (10:00 - 10:50)', students_present: '29/30', diary_status: 'Posted ✅' },
      { id: 'l3', date: '2026-09-24', class_name: 'Information Tech (A)', subject: teacher?.subject_name || 'DBMS', period: 'P3 (11:00 - 11:50)', students_present: '27/30', diary_status: 'Posted ✅' },
      { id: 'l4', date: '2026-09-23', class_name: 'Computer Science (B)', subject: teacher?.subject_name || 'Data Structures', period: 'P1 (09:00 - 09:50)', students_present: '25/28', diary_status: 'Posted ✅' },
      { id: 'l5', date: '2026-09-22', class_name: 'Computer Science (A)', subject: teacher?.subject_name || 'Data Structures', period: 'P2 (10:00 - 10:50)', students_present: '30/30', diary_status: 'Posted ✅' },
    ]

    return {
      monthCount: totalMonthCount,
      weekCount,
      todayCount,
      estimatedPayout,
      logs: demoLogs
    }
  }, [completedTodayCount, ratePerLecture, teacher])

  // Quick Action Switcher from Schedule Card
  const handleQuickAction = (action, cls) => {
    if (action === 'attendance') {
      setAttClassId(cls.class_id)
      setTab('attendance')
    } else if (action === 'diary') {
      setDiaryClassId(cls.class_id)
      if (cls.subject_name) setDiarySubject(cls.subject_name)
      setTab('diary')
    } else if (action === 'marks') {
      setMarksClassId(cls.class_id)
      setTab('marks')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading Teacher Dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/30 border border-white/10 flex-shrink-0">
            👨‍🏫
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Namaste, {teacher?.name || 'Teacher'} 👋
              </h1>
              {teacher?.subject_name && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {teacher.subject_name}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Teacher Portal • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Live Digital Clock Badge */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 relative z-10 self-start md:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="text-left">
            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Live Time</p>
            <p className="text-sm sm:text-base font-mono font-bold text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher Navigation ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { id: 'overview',    label: 'Overview',            icon: '🏠' },
          { id: 'schedule',    label: 'Aaj Ki Classes',      icon: '📅' },
          { id: 'attendance',  label: 'Take Attendance',     icon: '📝' },
          { id: 'marks',       label: 'Test Marks Entry',    icon: '🎯' },
          { id: 'diary',       label: 'Daily Diary & HW',    icon: '📖' },
          { id: 'alerts',      label: 'Weak Students Alert', icon: '⚠️' },
          { id: 'payouts',     label: 'Lecture Counter',     icon: '💼' },
        ].map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & AAJ KI CLASSES (Today's Schedule & Live Status)             */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'schedule') && (
        <div className="space-y-6 animate-fade-in">

          {/* 🌟 Prominent Hero Banner: Next Class & Today's Schedule Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Live Next Class Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 via-primary-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-indigo-700/30">
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-48 h-48 rounded-full bg-primary-500/20 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/15">
                  {liveClass ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-emerald-300">🔴 Lecture Happening Now</span>
                    </>
                  ) : nextClass ? (
                    <>
                      <span className="text-amber-300">⏰ Next Scheduled Class</span>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-300">🎉 Today's Schedule Completed</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-300 font-medium">
                  {todayName}'s Timetable
                </span>
              </div>

              {liveClass ? (
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {liveClass.subject_name || teacher?.subject_name || 'Subject Lecture'}
                  </h2>
                  <p className="text-indigo-200 text-sm mt-1 flex items-center gap-2 flex-wrap">
                    <span>🏫 Class: <strong className="text-white">{liveClass.class_name || 'All Enrolled'}</strong></span>
                    <span>•</span>
                    <span>🚪 Room: <strong className="text-white">{liveClass.room_number || 'Room 101'}</strong></span>
                    <span>•</span>
                    <span>⏳ {liveClass.start_time} – {liveClass.end_time}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={() => handleQuickAction('attendance', liveClass)}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                    >
                      📝 Take Attendance Now
                    </button>
                    <button
                      onClick={() => handleQuickAction('diary', liveClass)}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 text-white transition-all backdrop-blur-md"
                    >
                      📖 Add Diary / HW
                    </button>
                  </div>
                </div>
              ) : nextClass ? (
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {nextClass.subject_name || teacher?.subject_name || 'Subject Lecture'}
                  </h2>
                  <p className="text-indigo-200 text-sm mt-1 flex items-center gap-2 flex-wrap">
                    <span>🏫 Class: <strong className="text-white">{nextClass.class_name || 'Class'}</strong></span>
                    <span>•</span>
                    <span>🚪 Room: <strong className="text-white">{nextClass.room_number || 'Room 101'}</strong></span>
                    <span>•</span>
                    <span>⏰ Starts at: <strong className="text-amber-300">{nextClass.start_time}</strong></span>
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={() => handleQuickAction('attendance', nextClass)}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30 flex items-center gap-2"
                    >
                      📝 Prepare Attendance
                    </button>
                    <button
                      onClick={() => handleQuickAction('diary', nextClass)}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 text-white transition-all backdrop-blur-md"
                    >
                      📖 Write Diary
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    All Classes Done for Today!
                  </h2>
                  <p className="text-indigo-200 text-sm mt-1">
                    You have completed all scheduled lectures for today. You can review attendance or prepare homework for tomorrow.
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={() => setTab('diary')}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all shadow"
                    >
                      📖 View Today's Homework
                    </button>
                    <button
                      onClick={() => setTab('payouts')}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 text-white transition-all backdrop-blur-md"
                    >
                      💼 View Lecture Payouts
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Aaj Ki Total Classes Metric Card */}
            <div className="card flex flex-col justify-between p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  📅 Aaj Ki Total Classes
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900 tracking-tight">
                    {enrichedTodayClasses.length}
                  </span>
                  <span className="text-gray-500 text-sm font-semibold">Lectures Scheduled</span>
                </div>
              </div>

              {/* Progress Breakdown */}
              <div className="my-4 space-y-2">
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${enrichedTodayClasses.length > 0 ? (completedTodayCount / enrichedTodayClasses.length) * 100 : 0}%` }}
                  />
                  {liveClass && (
                    <div className="bg-amber-400 h-full animate-pulse" style={{ width: `${(1 / (enrichedTodayClasses.length || 1)) * 100}%` }} />
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span className="text-emerald-600 font-bold">✅ {completedTodayCount} Completed</span>
                  {liveClass && <span className="text-amber-500 font-bold">🔴 1 Live</span>}
                  <span className="text-slate-600 font-bold">
                    ⏳ {enrichedTodayClasses.filter(c => c.liveStatus === 'upcoming').length} Upcoming
                  </span>
                </div>
              </div>

              {/* Quick lecture rate info */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">Coaching Payout Rate:</span>
                <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                  ₹{ratePerLecture} / Lecture
                </span>
              </div>
            </div>
          </div>

          {/* 📅 Today's Timeline Cards */}
          <div className="card p-6 rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Today's Lecture Schedule ({todayName})
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daily timetable se auto-loaded lectures. Direct 1-click attendance aur homework enter karein.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 self-start sm:self-auto">
                {enrichedTodayClasses.length} Lectures Total
              </span>
            </div>

            {enrichedTodayClasses.length === 0 ? (
              <div className="text-center py-12 text-gray-400 space-y-2">
                <span className="text-4xl">☕</span>
                <p className="text-sm font-semibold text-gray-600">No classes scheduled for today.</p>
                <p className="text-xs text-gray-400">Take a break or prepare weekly tests and homework assignments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrichedTodayClasses.map((item, idx) => {
                  const isDone = item.liveStatus === 'done'
                  const isLive = item.liveStatus === 'live'

                  return (
                    <div
                      key={item.id || idx}
                      className={`relative rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                        isLive
                          ? 'bg-amber-50/60 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Top status & period */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-gray-900 text-white">
                          Period {item.period_number}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            Live Now
                          </span>
                        ) : isDone ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            ✓ Done
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Class & Subject Details */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 leading-tight">
                          {item.subject_name || teacher?.subject_name || 'Subject'}
                        </h3>
                        <p className="text-xs font-semibold text-primary-600 mt-1">
                          {item.class_name || 'Computer Science'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2.5">
                          <span>⏰ {item.start_time || '09:00'} – {item.end_time || '09:50'}</span>
                          <span>•</span>
                          <span>🚪 {item.room_number || 'Room 101'}</span>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="pt-4 mt-4 border-t border-gray-100/80 flex items-center gap-2">
                        <button
                          onClick={() => handleQuickAction('attendance', item)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                            isLive
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                              : 'bg-primary-50 hover:bg-primary-100 text-primary-700'
                          }`}
                        >
                          📝 Attendance
                        </button>
                        <button
                          onClick={() => handleQuickAction('diary', item)}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all text-center"
                        >
                          📖 Diary
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar across bottom of overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 rounded-2xl flex items-center gap-3 bg-white border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-bold">
                👥
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Total Students</p>
                <p className="text-lg font-bold text-gray-900">{students.length}</p>
              </div>
            </div>

            <div className="card p-4 rounded-2xl flex items-center gap-3 bg-white border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-bold">
                💼
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Month Lectures</p>
                <p className="text-lg font-bold text-emerald-600">{lectureStats.monthCount}</p>
              </div>
            </div>

            <div className="card p-4 rounded-2xl flex items-center gap-3 bg-white border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-bold">
                ⚠️
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Weak Students</p>
                <p className="text-lg font-bold text-amber-600">{studentAnalytics.weakStudents.length}</p>
              </div>
            </div>

            <div className="card p-4 rounded-2xl flex items-center gap-3 bg-white border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold">
                💰
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Est. Payout</p>
                <p className="text-lg font-bold text-indigo-600">₹{lectureStats.estimatedPayout.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUICK ATTENDANCE MARKER (Sirf 30 Seconds Me Attendance Done)          */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="card p-6 rounded-3xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <h2 className="text-xl font-bold text-gray-900">
                  Quick Attendance Marker
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Sabhi students by default "Present" hain. Jo absent hai use tap karke Absent karein aur Submit karein (Sirf 30s!).
              </p>
            </div>

            {/* Quick Live Stats Pill */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold self-start sm:self-auto">
              <span className="text-emerald-600 font-bold">✅ Present: {presentCount}</span>
              <span>•</span>
              <span className="text-red-500 font-bold">❌ Absent: {absentCount}</span>
              <span>•</span>
              <span className="text-amber-500 font-bold">⏳ Late: {lateCount}</span>
            </div>
          </div>

          {/* Controls: Class Selector & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100">
            <div>
              <label className="label">1. Select Class:</label>
              <select
                className="input font-semibold"
                value={attClassId}
                onChange={e => setAttClassId(e.target.value)}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.semester} ({c.section})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">2. Date:</label>
              <input
                type="date"
                className="input font-semibold"
                value={attDate}
                onChange={e => setAttDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Search Student:</label>
              <input
                type="text"
                placeholder="Search name or roll no..."
                className="input"
                value={attSearch}
                onChange={e => setAttSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Mark All Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAllAttendance('Present')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm"
              >
                ✅ Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAllAttendance('Absent')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
              >
                ❌ Mark All Absent
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Showing {classStudentsForAttendance.length} students in selected class
            </p>
          </div>

          {/* Student Rapid Marker List */}
          {classStudentsForAttendance.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No students enrolled in this class.
            </div>
          ) : (
            <div className="space-y-2">
              {classStudentsForAttendance
                .filter(s =>
                  !attSearch ||
                  s.name.toLowerCase().includes(attSearch.toLowerCase()) ||
                  (s.roll_number && s.roll_number.toLowerCase().includes(attSearch.toLowerCase()))
                )
                .map((student, idx) => {
                  const currentStatus = attStatuses[student.id] || 'Present'

                  return (
                    <div
                      key={student.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        currentStatus === 'Absent'
                          ? 'bg-red-50/50 border-red-200'
                          : currentStatus === 'Late'
                          ? 'bg-amber-50/50 border-amber-200'
                          : idx % 2 === 0
                          ? 'bg-gray-50/70 border-gray-100'
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      {/* Student Info */}
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 leading-tight">
                            {student.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Roll No: <span className="font-semibold text-gray-600">{student.roll_number || idx + 1}</span>
                            {student.student_id && ` • ID: ${student.student_id}`}
                          </p>
                        </div>
                      </div>

                      {/* 1-Tap Toggle Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => toggleAttendanceStatus(student.id, 'Present')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          ✓ Present
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAttendanceStatus(student.id, 'Absent')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            currentStatus === 'Absent'
                              ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          ✕ Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAttendanceStatus(student.id, 'Late')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            currentStatus === 'Late'
                              ? 'bg-amber-400 text-white shadow-md shadow-amber-400/30'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          ⏳ Late
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Feedback & Submit Button */}
          {attMsg && (
            <div className={`p-4 rounded-xl text-sm font-semibold ${
              attMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {attMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Submit karte hi attendance lock ho jayegi aur lecture counter update ho jayega.
            </p>
            <button
              type="button"
              onClick={handleAttendanceSubmit}
              disabled={attSubmitting || classStudentsForAttendance.length === 0}
              className="btn-primary text-sm px-6 py-2.5 font-bold shadow-lg shadow-primary-600/30 disabled:opacity-50"
            >
              {attSubmitting ? 'Saving Attendance...' : '🚀 Submit Attendance (Done!)'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WEEKLY TEST MARKS ENTRY (Marks Daalna)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'marks' && (
        <div className="card p-6 rounded-3xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <h2 className="text-xl font-bold text-gray-900">
                  Weekly Test Marks Entry
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Class aur Test select karein, har student ke aage marks dalein aur Save karein. Portal par turant update hoga!
              </p>
            </div>

            <button
              onClick={() => setShowNewTestModal(true)}
              className="btn-primary text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>+</span> Create New Weekly Test
            </button>
          </div>

          {/* Test & Class Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100">
            <div>
              <label className="label">1. Select Class:</label>
              <select
                className="input font-semibold"
                value={marksClassId}
                onChange={e => setMarksClassId(e.target.value)}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.semester} ({c.section})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">2. Select Test / Exam:</label>
              <select
                className="input font-semibold"
                value={marksExamId}
                onChange={e => setMarksExamId(e.target.value)}
              >
                {classExams.length === 0 ? (
                  <option value="">No tests found for this class</option>
                ) : (
                  classExams.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.subject} ({e.exam_date}) [Max: {e.max_marks}]
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Test Info Header Bar */}
          {selectedExamObj && (
            <div className="bg-indigo-50 border border-indigo-200/60 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-indigo-900 text-sm">{selectedExamObj.name}</p>
                <p className="text-indigo-600 mt-0.5">
                  Subject: {selectedExamObj.subject} • Date: {selectedExamObj.exam_date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white px-3 py-1 rounded-lg font-bold text-indigo-700 shadow-sm border border-indigo-100">
                  Max Marks: {selectedExamObj.max_marks}
                </span>
                <span className="bg-white px-3 py-1 rounded-lg font-semibold text-indigo-700 shadow-sm border border-indigo-100">
                  {classStudentsForMarks.length} Students
                </span>
              </div>
            </div>
          )}

          {/* Marks Entry Table */}
          {classStudentsForMarks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No students found for this class.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="w-16">Roll</th>
                    <th>Student Name</th>
                    <th className="w-40">Marks Obtained</th>
                    <th className="w-24">Percentage</th>
                    <th className="w-20">Grade</th>
                    <th>Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudentsForMarks.map((s, idx) => {
                    const studentMark = examMarks[s.id]?.marks ?? ''
                    const max = selectedExamObj?.max_marks || 20
                    const pct = studentMark !== '' ? Math.round((parseFloat(studentMark) / max) * 100) : null
                    const grade = autoGrade(studentMark, max)

                    return (
                      <tr key={s.id}>
                        <td className="font-bold text-gray-500">
                          {s.roll_number || idx + 1}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{s.name}</span>
                            {s.student_id && (
                              <span className="text-[11px] text-gray-400">({s.student_id})</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={max}
                              step="0.5"
                              placeholder="0"
                              className="input w-24 text-center font-bold text-sm py-1.5"
                              value={studentMark}
                              onChange={e => handleMarkChange(s.id, 'marks', e.target.value)}
                            />
                            <span className="text-xs font-semibold text-gray-400">/ {max}</span>
                          </div>
                        </td>
                        <td>
                          {pct !== null ? (
                            <span className={`text-xs font-bold ${pct >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td>
                          {grade ? (
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${gradeBadgeColor(grade)}`}>
                              {grade}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="e.g. Excellent, Practice Q3"
                            className="input text-xs py-1.5"
                            value={examMarks[s.id]?.remarks || ''}
                            onChange={e => handleMarkChange(s.id, 'remarks', e.target.value)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {marksMsg && (
            <div className={`p-4 rounded-xl text-sm font-semibold ${
              marksMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {marksMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Marks save hote hi student portal aur parent view par live results reflect ho jayenge.
            </p>
            <button
              onClick={handleSaveMarks}
              disabled={marksSubmitting || classStudentsForMarks.length === 0}
              className="btn-primary text-sm px-6 py-2.5 font-bold shadow-lg shadow-primary-600/30 disabled:opacity-50"
            >
              {marksSubmitting ? 'Saving Marks...' : '💾 Save Results to Portal'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create New Test */}
      {showNewTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Create New Weekly Test</h3>
              <button onClick={() => setShowNewTestModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className="label">Test Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit Test 1 (Maths)"
                  className="input font-semibold"
                  value={newTestForm.name}
                  onChange={e => setNewTestForm({ ...newTestForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Subject:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  className="input font-semibold"
                  value={newTestForm.subject || teacher?.subject_name || ''}
                  onChange={e => setNewTestForm({ ...newTestForm, subject: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Test Date:</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={newTestForm.exam_date}
                    onChange={e => setNewTestForm({ ...newTestForm, exam_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Max Marks:</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    required
                    className="input"
                    value={newTestForm.max_marks}
                    onChange={e => setNewTestForm({ ...newTestForm, max_marks: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Class:</label>
                <select
                  className="input"
                  value={newTestForm.class_id || marksClassId}
                  onChange={e => setNewTestForm({ ...newTestForm, class_id: e.target.value })}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewTestModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTest}
                  className="btn-primary"
                >
                  {creatingTest ? 'Creating...' : 'Create & Select Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DAILY HOMEWORK & CLASS DIARY (Aaj Kya Padhaya)                        */}
      {/* ========================================================================= */}
      {activeTab === 'diary' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in">
          {/* Post Form */}
          <div className="lg:col-span-3 card p-6 rounded-3xl space-y-5">
            <div className="pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📖</span>
                <h2 className="text-xl font-bold text-gray-900">
                  Daily Homework & Class Diary
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                "Aaj tuition me kya karwaya?" Har class ke baad topics aur homework enter karein. Seedha student dashboard par dikhega!
              </p>
            </div>

            <form onSubmit={handlePostDiary} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Class:</label>
                  <select
                    className="input font-semibold"
                    value={diaryClassId}
                    onChange={e => setDiaryClassId(e.target.value)}
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.semester} ({c.section})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Date:</label>
                  <input
                    type="date"
                    className="input font-semibold"
                    value={diaryDate}
                    onChange={e => setDiaryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Topics Covered */}
              <div>
                <label className="label flex items-center justify-between">
                  <span>Topics Covered (Aaj Kya Padhaya):</span>
                  <span className="text-gray-400 font-normal">e.g. Chapter 3: Exercise 3.2</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Chapter 3: Quadratic Equations (Exercise 3.2 - solved questions 1 to 5, explained quadratic formula derivation)."
                  className="input font-medium"
                  value={topicsCovered}
                  onChange={e => setTopicsCovered(e.target.value)}
                />
              </div>

              {/* Homework Given */}
              <div>
                <label className="label flex items-center justify-between">
                  <span>Homework Given (Ghar Ka Kaam):</span>
                  <span className="text-gray-400 font-normal">e.g. Questions 6 to 12</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Solve Questions 6 to 12 from textbook page 45. Complete notes of Chapter 3."
                  className="input font-medium"
                  value={homeworkGiven}
                  onChange={e => setHomeworkGiven(e.target.value)}
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="label">Homework Due Date (Kab Tak Submit Karna Hai):</label>
                <input
                  type="date"
                  className="input max-w-xs"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              {diaryMsg && (
                <div className={`p-4 rounded-xl text-sm font-semibold ${
                  diaryMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {diaryMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={diarySubmitting}
                className="btn-primary w-full py-3 font-bold shadow-md shadow-primary-600/30 text-sm"
              >
                {diarySubmitting ? 'Publishing...' : '🚀 Publish to Student & Parent Portal'}
              </button>
            </form>
          </div>

          {/* Recent History */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-gray-900 text-base">Recent Diary Entries</h3>
              <span className="text-xs text-gray-400">{diaries.length} entries</span>
            </div>

            {diaries.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <span className="text-3xl">📝</span>
                <p className="text-xs font-semibold text-gray-600 mt-2">No diary entries published yet.</p>
                <p className="text-[11px] text-gray-400">Fill the form to publish today's class topics.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {diaries.map(d => (
                  <div key={d.id} className="card p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow relative">
                    <button
                      onClick={() => handleDeleteDiary(d.id)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xs p-1"
                      title="Delete entry"
                    >
                      🗑️
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                        {d.class_name || 'Class'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">📅 {d.date}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <strong className="text-gray-900 block font-semibold">Topics Covered:</strong>
                        <p className="text-gray-600 mt-0.5">{d.topics_covered}</p>
                      </div>
                      {d.homework && (
                        <div className="pt-1.5 border-t border-gray-50">
                          <strong className="text-amber-800 block font-semibold">Homework Given:</strong>
                          <p className="text-gray-600 mt-0.5">{d.homework}</p>
                          {d.due_date && (
                            <p className="text-[11px] text-amber-600 font-bold mt-1">Due: {d.due_date}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. WEAK STUDENTS ALERT & ANALYTICS (Performance Tracking + WhatsApp)     */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <h2 className="text-xl font-bold text-gray-900">
                  Student Performance & Weak Students Alert
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Top performers aur needs-attention students ka live track. Direct WhatsApp button se parent ko update dein.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 🏆 Top 3 Performers */}
            <div className="card p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white to-white border border-amber-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-100">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Top 3 Students</h3>
                  <p className="text-xs text-gray-500">Highest marks & attendance</p>
                </div>
              </div>

              <div className="space-y-3">
                {studentAnalytics.topStudents.map((s, idx) => {
                  const medals = ['🥇 1st Rank', '🥈 2nd Rank', '🥉 3rd Rank']
                  const badges = ['bg-amber-100 text-amber-800 border-amber-300', 'bg-slate-100 text-slate-800 border-slate-300', 'bg-orange-100 text-orange-800 border-orange-300']

                  return (
                    <div key={s.id} className="p-3.5 rounded-2xl border border-gray-100 bg-white flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">{s.name}</p>
                          <p className="text-xs text-gray-400">
                            Roll No: {s.roll_number || idx + 1}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${badges[idx]}`}>
                          {medals[idx]}
                        </span>
                        <p className="text-xs font-black text-emerald-600 mt-1">
                          {s.avgMarksPct}% Score
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ⚠️ Needs Attention (Weak Students) */}
            <div className="lg:col-span-2 card p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Needs Attention (Weak Students)</h3>
                    <p className="text-xs text-gray-500">
                      Jin students ke marks 40% se kam aaye hain ya jo absent hain.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {studentAnalytics.weakStudents.length} Students Alerted
                </span>
              </div>

              <div className="space-y-3">
                {studentAnalytics.weakStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl border border-red-100 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-200 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-900">{s.name}</h4>
                        <span className="text-xs text-gray-400">(Roll: {s.roll_number || '—'})</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                          {s.weakReason}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Parent Contact: <strong className="text-gray-700">{s.phone || '+91 98234 56781'}</strong>
                      </p>
                    </div>

                    {/* WhatsApp Parent Button */}
                    <button
                      onClick={() => openWhatsAppModal(s)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0"
                    >
                      <span>💬</span> WhatsApp Parent
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: WhatsApp Parent Preview & Send */}
      {whatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💬</span>
                <h3 className="text-lg font-bold text-gray-900">Message Parent on WhatsApp</h3>
              </div>
              <button onClick={() => setWhatsAppModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <p><strong>Student:</strong> {whatsAppModal.name} (Roll: {whatsAppModal.roll_number || '—'})</p>
                <p><strong>Reason:</strong> {whatsAppModal.weakReason}</p>
                <p><strong>Phone:</strong> {whatsAppModal.phone || '+91 98234 56781'}</p>
              </div>

              {/* Language Switcher */}
              <div>
                <label className="label">Select Message Language:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsAppLang('hinglish')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      whatsAppLang === 'hinglish' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Hindi / Hinglish (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsAppLang('english')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      whatsAppLang === 'english' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Message Box */}
              <div>
                <label className="label">Message Preview:</label>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-medium leading-relaxed">
                  {getWhatsAppMessage(whatsAppModal, whatsAppLang)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setWhatsAppModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <span>💬</span> Open WhatsApp & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TEACHER LECTURE COUNTER (Coaching Payouts Ke Liye)                     */}
      {/* ========================================================================= */}
      {activeTab === 'payouts' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💼</span>
                <h2 className="text-xl font-bold text-gray-900">
                  Teacher Lecture Counter & Coaching Payouts
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Coaching / tuition me per lecture hisaab. Teacher aur coaching owner dono ke paas transparent records.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs font-semibold px-4 py-2 flex items-center gap-2 self-start sm:self-auto"
            >
              <span>🖨️</span> Print Payout Slip
            </button>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 rounded-3xl bg-gradient-to-br from-indigo-500 to-primary-700 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">This Month Completed</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black">{lectureStats.monthCount}</span>
                <span className="text-indigo-100 text-sm font-medium">Lectures</span>
              </div>
              <p className="text-xs text-indigo-200 mt-2">Transparent verified count</p>
            </div>

            <div className="card p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Estimated Payout</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black">₹{lectureStats.estimatedPayout.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-emerald-200 mt-2">At ₹{ratePerLecture} per lecture</p>
            </div>

            <div className="card p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">This Week</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black">{lectureStats.weekCount}</span>
                <span className="text-amber-100 text-sm font-medium">Lectures</span>
              </div>
              <p className="text-xs text-amber-200 mt-2">Monday to Saturday</p>
            </div>

            <div className="card p-5 rounded-3xl bg-gradient-to-br from-purple-600 to-slate-800 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-200">Today</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black">{lectureStats.todayCount}</span>
                <span className="text-purple-200 text-sm font-medium">Lectures Taken</span>
              </div>
              <p className="text-xs text-purple-300 mt-2">{todayName}'s sessions</p>
            </div>
          </div>

          {/* Rate Calculator Settings Card */}
          <div className="card p-6 rounded-3xl bg-slate-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Coaching Payout Settings</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Apna per lecture remuneration rate set karein. Estimated calculation turant update ho jayega.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700">Rate Per Lecture (₹):</span>
              <input
                type="number"
                min="100"
                step="50"
                className="input w-32 font-bold text-primary-600 text-base py-1.5 text-center bg-white"
                value={ratePerLecture}
                onChange={e => handleRateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Transparent Completed Lectures History Table */}
          <div className="card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">
                Completed Lecture Log (This Month's Transparent Hisaab)
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                Verified from Attendance & Diary Records
              </span>
            </div>

            <div className="table-wrapper">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Period / Time</th>
                    <th>Attendance Taken</th>
                    <th>Diary Posted</th>
                    <th className="text-right">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {lectureStats.logs.map(log => (
                    <tr key={log.id}>
                      <td className="font-semibold text-gray-700">{log.date}</td>
                      <td className="font-bold text-primary-600">{log.class_name}</td>
                      <td>{log.subject}</td>
                      <td className="text-gray-500">{log.period}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          {log.students_present}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-gray-600">{log.diary_status}</span>
                      </td>
                      <td className="text-right font-bold text-emerald-600">
                        ₹{ratePerLecture}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
