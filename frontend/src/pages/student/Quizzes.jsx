import { useState, useEffect } from 'react'
import api from '../../api/axios'

export default function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  // Active Test State
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [parsedQuestions, setParsedQuestions] = useState([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Detail / Review Modal
  const [reviewQuiz, setReviewQuiz] = useState(null)
  const [reviewSubmission, setReviewSubmission] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [qRes, sRes] = await Promise.all([
        api.get('/quizzes/').catch(() => ({ data: [] })),
        api.get('/quizzes/student/my-submissions').catch(() => ({ data: [] }))
      ])
      setQuizzes(qRes.data || [])
      setSubmissions(sRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Timer tick for active quiz
  useEffect(() => {
    if (!activeQuiz || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeQuiz, timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startQuiz = (quiz) => {
    let questions = []
    try {
      questions = typeof quiz.questions_json === 'string' ? JSON.parse(quiz.questions_json) : (quiz.questions_json || [])
    } catch (e) {
      questions = []
    }

    if (!questions.length) {
      alert('This quiz has no questions yet.')
      return
    }

    setActiveQuiz(quiz)
    setParsedQuestions(questions)
    setCurrentQIndex(0)
    setUserAnswers({})
    setTimeLeft((quiz.duration_minutes || 15) * 60)
    setTestResult(null)
  }

  const handleSelectOption = (optIndex) => {
    const q = parsedQuestions[currentQIndex]
    const qKey = q.id || String(currentQIndex)
    setUserAnswers(prev => ({
      ...prev,
      [qKey]: optIndex
    }))
  }

  const handleAutoSubmit = () => {
    handleSubmitQuiz(true)
  }

  const handleSubmitQuiz = async (isAuto = false) => {
    if (!activeQuiz || submitting) return
    if (!isAuto && !window.confirm('Are you sure you want to finish and submit this test?')) {
      return
    }

    setSubmitting(true)
    const totalDuration = (activeQuiz.duration_minutes || 15) * 60
    const timeSpent = Math.max(0, totalDuration - timeLeft)

    try {
      const res = await api.post(`/quizzes/${activeQuiz.id}/submit`, {
        answers: userAnswers,
        time_spent_seconds: timeSpent
      })

      setTestResult({
        ...res.data,
        quiz: activeQuiz,
        questions: parsedQuestions,
        answers: userAnswers
      })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeTest = () => {
    setActiveQuiz(null)
    setParsedQuestions([])
    setTestResult(null)
    setUserAnswers({})
  }

  const getSubmissionForQuiz = (quizId) => {
    return submissions.find(s => s.quiz_id === quizId)
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-900 via-indigo-900 to-purple-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-primary-200 text-xs font-semibold mb-3 border border-white/10">
              <span>⏱️ Real-time Assessment</span>
              <span>•</span>
              <span>Countdown Timer & Instant Scorecard</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Live Online MCQ Quizzes
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-xl">
              Take timed multiple-choice sprint tests, test your understanding instantly, and review detailed answers and explanations.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-center">
              <p className="text-xs text-primary-200 font-medium">Available Quizzes</p>
              <p className="text-2xl font-black text-white mt-0.5">{quizzes.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-center">
              <p className="text-xs text-emerald-300 font-medium">Completed</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{submissions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Quizzes Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🚀</span> Available Tests for You
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              📝
            </div>
            <h3 className="text-lg font-bold text-slate-800">No active quizzes right now</h3>
            <p className="text-slate-500 text-sm mt-1">Check back later when your teachers schedule new tests!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => {
              const sub = getSubmissionForQuiz(quiz.id)
              let qCount = 0
              try {
                const qList = typeof quiz.questions_json === 'string' ? JSON.parse(quiz.questions_json) : (quiz.questions_json || [])
                qCount = qList.length
              } catch (e) {}

              return (
                <div
                  key={quiz.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-primary-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                        {quiz.subject}
                      </span>
                      {sub ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          ✓ Score: {sub.score}/{sub.total_marks}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          🟢 Live Now
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {quiz.title}
                    </h3>
                    <p className="text-slate-500 text-xs mt-2 line-clamp-2">
                      {quiz.description || 'Sprint MCQ Test to test subject concepts.'}
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-5 py-3 border-y border-slate-100 text-center">
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">Questions</p>
                        <p className="text-sm font-bold text-slate-700">{qCount || quiz.total_marks}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">Duration</p>
                        <p className="text-sm font-bold text-slate-700">{quiz.duration_minutes} Mins</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">Total Marks</p>
                        <p className="text-sm font-bold text-slate-700">{quiz.total_marks}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {sub ? (
                      <button
                        onClick={() => startQuiz(quiz)}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-700 border border-slate-200 transition-all flex items-center justify-center gap-2"
                      >
                        <span>🔄 Re-Attempt / Practice</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startQuiz(quiz)}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>🚀 Start Live Test</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ACTIVE LIVE QUIZ MODAL ── */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* If test finished and showing result */}
            {testResult ? (
              <div className="p-6 md:p-8 overflow-y-auto space-y-6">
                <div className="text-center py-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-primary-50 rounded-3xl border border-indigo-100">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-4xl text-white shadow-xl shadow-emerald-500/30 mx-auto mb-4">
                    🎉
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                    Test Completed!
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Here is your detailed performance report</p>

                  <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-400 font-bold uppercase">Your Score</p>
                      <p className="text-3xl font-black text-emerald-600">
                        {testResult.score} <span className="text-slate-400 text-lg">/ {testResult.total_marks}</span>
                      </p>
                    </div>
                    <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-400 font-bold uppercase">Percentage</p>
                      <p className="text-3xl font-black text-primary-600">{testResult.percentage}%</p>
                    </div>
                  </div>
                </div>

                {/* Question Review */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>📖</span> Detailed Answer Key & Explanations:
                  </h3>
                  {testResult.questions.map((q, idx) => {
                    const qId = q.id || String(idx)
                    const userChoice = testResult.answers[qId]
                    const correctChoice = q.correct_option !== undefined ? q.correct_option : q.answer
                    const isCorrect = userChoice !== undefined && userChoice !== null && parseInt(userChoice, 10) === parseInt(correctChoice, 10)

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border ${
                          isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold text-slate-800">
                            Q{idx + 1}. {q.question}
                          </p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                            isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                          }`}>
                            {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                          </span>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {q.options?.map((opt, oIdx) => {
                            const isUserPick = parseInt(userChoice, 10) === oIdx
                            const isRightPick = parseInt(correctChoice, 10) === oIdx

                            let btnStyle = 'bg-white text-slate-700 border-slate-200'
                            if (isRightPick) btnStyle = 'bg-emerald-500 text-white font-bold border-emerald-600 shadow-sm'
                            else if (isUserPick && !isRightPick) btnStyle = 'bg-red-500 text-white font-bold border-red-600'

                            return (
                              <div
                                key={oIdx}
                                className={`px-3 py-2 rounded-xl text-xs border flex items-center gap-2 ${btnStyle}`}
                              >
                                <span className="font-bold opacity-80">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span>{opt}</span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Explanation note */}
                        {q.explanation && (
                          <div className="mt-3 text-xs bg-white/80 p-2.5 rounded-xl border border-slate-200/80 text-slate-600">
                            <span className="font-bold text-slate-800">💡 Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={closeTest}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-md"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Ongoing Live Quiz Screen */
              <>
                {/* Quiz Header Bar with Timer */}
                <div className="p-4 md:px-6 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base md:text-lg line-clamp-1">{activeQuiz.title}</h3>
                    <p className="text-xs text-slate-400">{activeQuiz.subject} • {parsedQuestions.length} Questions</p>
                  </div>

                  {/* Countdown Timer */}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-mono text-sm md:text-base font-black ${
                    timeLeft < 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-primary-300 border border-slate-700'
                  }`}>
                    <span>⏱️</span>
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5">
                  <div
                    className="bg-primary-600 h-1.5 transition-all duration-300"
                    style={{
                      width: `${((currentQIndex + 1) / parsedQuestions.length) * 100}%`
                    }}
                  />
                </div>

                {/* Question Area */}
                <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
                  {parsedQuestions[currentQIndex] && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                          Question {currentQIndex + 1} of {parsedQuestions.length}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          +{parsedQuestions[currentQIndex].marks || 1} Mark
                        </span>
                      </div>

                      <h4 className="text-lg md:text-xl font-bold text-slate-800 leading-snug">
                        {parsedQuestions[currentQIndex].question}
                      </h4>

                      {/* Options Radio List */}
                      <div className="space-y-3 pt-2">
                        {parsedQuestions[currentQIndex].options?.map((opt, oIdx) => {
                          const qKey = parsedQuestions[currentQIndex].id || String(currentQIndex)
                          const isSelected = userAnswers[qKey] === oIdx

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectOption(oIdx)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 ${
                                isSelected
                                  ? 'bg-primary-50/80 border-primary-600 text-primary-950 font-semibold shadow-md'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                isSelected
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <span className="text-sm md:text-base flex-1">{opt}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Navigation Bar */}
                <div className="p-4 md:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <button
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                  >
                    ← Previous
                  </button>

                  <div className="flex gap-1.5 overflow-x-auto max-w-[200px] md:max-w-none px-2">
                    {parsedQuestions.map((_, i) => {
                      const qKey = parsedQuestions[i]?.id || String(i)
                      const isAnswered = userAnswers[qKey] !== undefined
                      const isCurrent = currentQIndex === i

                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentQIndex(i)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                              : isAnswered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white border border-slate-200 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </button>
                      )
                    })}
                  </div>

                  {currentQIndex < parsedQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQIndex(prev => prev + 1)}
                      className="px-5 py-2 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-all"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      disabled={submitting}
                      onClick={() => handleSubmitQuiz(false)}
                      className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all"
                    >
                      {submitting ? 'Submitting...' : '✓ Submit Test'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
