import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

type Variables = {
  userPayload: {
    sub: string
    role: string
    exp: number
  }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ── CORS ─────────────────────────────────────────────────────────────
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}))

// ── Auth Middleware ──────────────────────────────────────────────────
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ detail: 'Not authenticated' }, 401)
  }
  const token = authHeader.substring(7)
  const secret = c.env.JWT_SECRET || 'college-super-secret-key-2024'
  try {
    const payload = await verify(token, secret, 'HS256')
    c.set('userPayload', payload as any)
    await next()
  } catch (err: any) {
    return c.json({ detail: 'Invalid or expired token', error: err?.message || String(err) }, 401)
  }
}

const requireAdmin = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ detail: 'Not authenticated' }, 401)
  }
  const token = authHeader.substring(7)
  const secret = c.env.JWT_SECRET || 'college-super-secret-key-2024'
  try {
    const payload: any = await verify(token, secret, 'HS256')
    c.set('userPayload', payload)
    if (payload.role !== 'admin') {
      return c.json({ detail: 'Admin privileges required' }, 403)
    }
    await next()
  } catch (err: any) {
    return c.json({ detail: 'Invalid or expired token', error: err?.message || String(err) }, 401)
  }
}

const requireStaff = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ detail: 'Not authenticated' }, 401)
  }
  const token = authHeader.substring(7)
  const secret = c.env.JWT_SECRET || 'college-super-secret-key-2024'
  try {
    const payload: any = await verify(token, secret, 'HS256')
    c.set('userPayload', payload)
    if (payload.role !== 'admin' && payload.role !== 'teacher') {
      return c.json({ detail: 'Staff privileges required' }, 403)
    }
    await next()
  } catch (err: any) {
    return c.json({ detail: 'Invalid or expired token', error: err?.message || String(err) }, 401)
  }
}

app.onError((err, c) => {
  console.error('App Error:', err)
  return c.json({ detail: err.message || 'Internal server error' }, 500)
})

// ── Root Health Check ────────────────────────────────────────────────
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: 'College Student Management System (Cloudflare Worker)',
    version: '1.0.0'
  })
})

// ── AUTH ENDPOINTS ───────────────────────────────────────────────────
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) {
    return c.json({ detail: 'Email and password required' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email.toLowerCase()).first<any>()

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return c.json({ detail: 'Invalid email or password' }, 401)
  }

  const secret = c.env.JWT_SECRET || 'college-super-secret-key-2024'
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  const token = await sign({ sub: user.id, role: user.role, exp }, secret, 'HS256')

  return c.json({
    access_token: token,
    token_type: 'bearer',
    role: user.role,
    user_id: user.id
  })
})

app.get('/auth/me', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const user = await c.env.DB.prepare(
    'SELECT id, email, role, is_active, created_at FROM users WHERE id = ?'
  ).bind(sub).first()
  if (!user) return c.json({ detail: 'User not found' }, 404)
  return c.json(user)
})

app.post('/auth/change-password', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const { old_password, new_password } = await c.req.json()

  if (!new_password || new_password.trim().length < 4) {
    return c.json({ detail: 'New password must be at least 4 characters' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(sub).first<any>()
  if (!user || !bcrypt.compareSync(old_password, user.password)) {
    return c.json({ detail: 'Current password is incorrect' }, 400)
  }

  const hashed = bcrypt.hashSync(new_password.trim(), 10)
  await c.env.DB.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(hashed, sub).run()

  return c.json({ message: 'Password changed successfully' })
})

// ── CLASSES ENDPOINTS ────────────────────────────────────────────────
app.get('/classes/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM classes ORDER BY name, semester, section'
  ).all()
  return c.json(results || [])
})

app.get('/classes/:id', async (c) => {
  const id = c.req.param('id')
  const item = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first()
  if (!item) return c.json({ detail: 'Class not found' }, 404)
  return c.json(item)
})

app.post('/classes/', requireAdmin, async (c) => {
  const { name, semester, section } = await c.req.json()
  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare(
      'INSERT INTO classes (id, name, semester, section) VALUES (?, ?, ?, ?)'
    ).bind(id, name, semester, section).run()
    const created = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first()
    return c.json(created, 201)
  } catch (err: any) {
    return c.json({ detail: 'Class with this name, semester, and section already exists' }, 400)
  }
})

app.put('/classes/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { name, semester, section } = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE classes SET name = ?, semester = ?, section = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(name, semester, section, id).run()
  const updated = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/classes/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run()
  return c.json({ message: 'Class deleted successfully' })
})

// ── SUBJECTS ENDPOINTS ───────────────────────────────────────────────
app.get('/subjects/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM subjects ORDER BY name').all()
  return c.json(results || [])
})

app.post('/subjects/', requireAdmin, async (c) => {
  const { name, code, description } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO subjects (id, name, code, description) VALUES (?, ?, ?, ?)'
  ).bind(id, name, code || null, description || null).run()
  const created = await c.env.DB.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first()
  return c.json(created, 201)
})

app.delete('/subjects/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run()
  return c.json({ message: 'Subject deleted successfully' })
})

// ── STUDENTS ENDPOINTS ───────────────────────────────────────────────
app.get('/students/', requireStaff, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT s.*, 
           c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    ORDER BY s.name ASC
  `).all()

  const formatted = (results || []).map((s: any) => ({
    ...s,
    class_info: s.class_id ? {
      id: s.class_id,
      name: s.class_name,
      semester: s.class_semester,
      section: s.class_section
    } : null
  }))
  return c.json(formatted)
})

app.get('/students/me', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const s: any = await c.env.DB.prepare(`
    SELECT s.*, 
           c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.user_id = ? OR s.id = ?
  `).bind(sub, sub).first()

  if (!s) return c.json({ detail: 'Student profile not found' }, 404)
  return c.json({
    ...s,
    class_info: s.class_id ? {
      id: s.class_id,
      name: s.class_name,
      semester: s.class_semester,
      section: s.class_section
    } : null
  })
})

app.get('/students/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const s: any = await c.env.DB.prepare(`
    SELECT s.*, 
           c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).bind(id).first()
  if (!s) return c.json({ detail: 'Student not found' }, 404)
  return c.json({
    ...s,
    class_info: s.class_id ? {
      id: s.class_id,
      name: s.class_name,
      semester: s.class_semester,
      section: s.class_section
    } : null
  })
})

app.post('/students/', requireAdmin, async (c) => {
  const body = await c.req.json()
  const student_id_code = body.student_id || ('STU' + Math.floor(100000 + Math.random() * 900000))
  const plainPassword = body.password || 'student123'
  const hashedPassword = bcrypt.hashSync(plainPassword, 10)

  const userId = crypto.randomUUID()
  const studentId = crypto.randomUUID()

  try {
    // Create login account
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password, role, is_active)
      VALUES (?, ?, ?, 'student', 1)
    `).bind(userId, body.email.toLowerCase(), hashedPassword).run()

    // Create student record
    await c.env.DB.prepare(`
      INSERT INTO students (id, user_id, student_id, name, email, phone, gender, dob, address, class_id, roll_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      studentId,
      userId,
      student_id_code,
      body.name,
      body.email.toLowerCase(),
      body.phone || null,
      body.gender || null,
      body.dob || null,
      body.address || null,
      body.class_id || null,
      body.roll_number || null
    ).run()

    const created: any = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(studentId).first()
    return c.json({ ...created, initial_password: plainPassword }, 201)
  } catch (err: any) {
    return c.json({ detail: 'Email or Student ID already exists' }, 400)
  }
})

app.put('/students/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE students
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        address = COALESCE(?, address),
        class_id = COALESCE(?, class_id),
        roll_number = COALESCE(?, roll_number),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.name ?? null,
    body.phone ?? null,
    body.gender ?? null,
    body.dob ?? null,
    body.address ?? null,
    body.class_id ?? null,
    body.roll_number ?? null,
    id
  ).run()

  const updated: any = await c.env.DB.prepare(`
    SELECT s.*, c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).bind(id).first()

  return c.json({
    ...updated,
    class_info: updated?.class_id ? {
      id: updated.class_id,
      name: updated.class_name,
      semester: updated.class_semester,
      section: updated.class_section
    } : null
  })
})

app.delete('/students/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const student: any = await c.env.DB.prepare('SELECT user_id FROM students WHERE id = ?').bind(id).first()
  if (student?.user_id) {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(student.user_id).run()
  }
  await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run()
  return c.json({ message: 'Student deleted successfully' })
})

// ── TEACHERS ENDPOINTS ───────────────────────────────────────────────
app.get('/teachers/', requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, s.name as subject_name, s.code as subject_code
    FROM teachers t
    LEFT JOIN subjects s ON t.subject_id = s.id
    ORDER BY t.name ASC
  `).all()

  const formatted = (results || []).map((t: any) => ({
    ...t,
    subject: t.subject_id ? {
      id: t.subject_id,
      name: t.subject_name,
      code: t.subject_code
    } : null
  }))
  return c.json(formatted)
})

app.get('/teachers/me', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const t: any = await c.env.DB.prepare(`
    SELECT t.*, s.name as subject_name, s.code as subject_code
    FROM teachers t
    LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE t.user_id = ? OR t.id = ?
  `).bind(sub, sub).first()

  if (!t) return c.json({ detail: 'Teacher profile not found' }, 404)
  return c.json({
    ...t,
    subject: t.subject_id ? {
      id: t.subject_id,
      name: t.subject_name,
      code: t.subject_code
    } : null
  })
})

app.post('/teachers/', requireAdmin, async (c) => {
  const body = await c.req.json()
  const plainPassword = body.password || 'teacher123'
  const hashedPassword = bcrypt.hashSync(plainPassword, 10)

  const userId = crypto.randomUUID()
  const teacherId = crypto.randomUUID()

  try {
    if (body.email) {
      await c.env.DB.prepare(`
        INSERT INTO users (id, email, password, role, is_active)
        VALUES (?, ?, ?, 'teacher', 1)
      `).bind(userId, body.email.toLowerCase(), hashedPassword).run()
    }

    await c.env.DB.prepare(`
      INSERT INTO teachers (id, name, email, phone, qualification, specialization, address, gender, user_id, subject_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      teacherId,
      body.name,
      body.email ? body.email.toLowerCase() : null,
      body.phone || null,
      body.qualification || null,
      body.specialization || null,
      body.address || null,
      body.gender || null,
      body.email ? userId : null,
      body.subject_id || null
    ).run()

    const created: any = await c.env.DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(teacherId).first()
    return c.json({ ...created, initial_password: plainPassword }, 201)
  } catch (err: any) {
    return c.json({ detail: 'Email already exists' }, 400)
  }
})

app.put('/teachers/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE teachers
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        qualification = COALESCE(?, qualification),
        specialization = COALESCE(?, specialization),
        address = COALESCE(?, address),
        gender = COALESCE(?, gender),
        subject_id = COALESCE(?, subject_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.name ?? null,
    body.phone ?? null,
    body.qualification ?? null,
    body.specialization ?? null,
    body.address ?? null,
    body.gender ?? null,
    body.subject_id ?? null,
    id
  ).run()

  const updated: any = await c.env.DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/teachers/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const teacher: any = await c.env.DB.prepare('SELECT user_id FROM teachers WHERE id = ?').bind(id).first()
  if (teacher?.user_id) {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(teacher.user_id).run()
  }
  await c.env.DB.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run()
  return c.json({ message: 'Teacher deleted successfully' })
})

// ── ATTENDANCE ENDPOINTS ─────────────────────────────────────────────
app.get('/attendance/', requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT a.*, s.name as student_name, s.student_id as student_code, s.roll_number,
           c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON a.class_id = c.id
    ORDER BY a.date DESC
    LIMIT 200
  `).all()
  return c.json(results || [])
})

app.get('/attendance/class/:class_id', async (c) => {
  const classId = c.req.param('class_id')
  const date = c.req.query('date')

  let query = `
    SELECT a.*, s.name as student_name, s.student_id as student_code, s.roll_number
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.class_id = ?
  `
  const params: any[] = [classId]
  if (date) {
    query += ' AND a.date = ?'
    params.push(date)
  }
  query += ' ORDER BY a.date DESC, s.name ASC'

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results || [])
})

app.get('/attendance/me', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const student: any = await c.env.DB.prepare(
    'SELECT id FROM students WHERE user_id = ? OR id = ?'
  ).bind(sub, sub).first()

  if (!student) return c.json({ detail: 'Student profile not found' }, 404)

  const { results } = await c.env.DB.prepare(`
    SELECT a.*, c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE a.student_id = ?
    ORDER BY a.date DESC
  `).bind(student.id).all()

  return c.json(results || [])
})

app.post('/attendance/bulk', requireStaff, async (c) => {
  const { sub } = c.get('userPayload')
  const { class_id, date, records } = await c.req.json()

  if (!class_id || !date || !records || !Array.isArray(records)) {
    return c.json({ detail: 'Invalid data' }, 400)
  }

  const statements = records.map((r: any) => {
    const id = crypto.randomUUID()
    return c.env.DB.prepare(`
      INSERT INTO attendance (id, student_id, class_id, date, status, marked_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, class_id, date) DO UPDATE SET
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `).bind(id, r.student_id, class_id, date, r.status || 'Present', sub)
  })

  await c.env.DB.batch(statements)

  const { results } = await c.env.DB.prepare(`
    SELECT a.*, s.name as student_name, s.student_id as student_code, s.roll_number
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.class_id = ? AND a.date = ?
  `).bind(class_id, date).all()

  return c.json(results || [], 201)
})

app.put('/attendance/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { status, date } = await c.req.json()

  await c.env.DB.prepare(`
    UPDATE attendance
    SET status = COALESCE(?, status),
        date = COALESCE(?, date),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status ?? null, date ?? null, id).run()

  const updated = await c.env.DB.prepare('SELECT * FROM attendance WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/attendance/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM attendance WHERE id = ?').bind(id).run()
  return c.json({ message: 'Attendance record deleted' })
})

// ── EXAMS ENDPOINTS ──────────────────────────────────────────────────
app.get('/exams/', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT e.*, c.name as class_name, c.semester as class_semester, c.section as class_section
    FROM exams e
    LEFT JOIN classes c ON e.class_id = c.id
    ORDER BY e.exam_date DESC
  `).all()

  const formatted = (results || []).map((e: any) => ({
    ...e,
    class_info: e.class_id ? {
      id: e.class_id,
      name: e.class_name,
      semester: e.class_semester,
      section: e.class_section
    } : null
  }))
  return c.json(formatted)
})

app.get('/exams/my', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const student: any = await c.env.DB.prepare(
    'SELECT class_id FROM students WHERE user_id = ? OR id = ?'
  ).bind(sub, sub).first()

  let query = 'SELECT e.*, c.name as class_name FROM exams e LEFT JOIN classes c ON e.class_id = c.id'
  const params: any[] = []

  if (student?.class_id) {
    query += ' WHERE e.class_id = ? OR e.class_id IS NULL'
    params.push(student.class_id)
  }
  query += ' ORDER BY e.exam_date ASC'

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results || [])
})

app.post('/exams/', requireStaff, async (c) => {
  const { name, subject, exam_date, max_marks, class_id } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO exams (id, name, subject, exam_date, max_marks, class_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, name, subject, exam_date, max_marks || 100, class_id || null).run()

  const created: any = await c.env.DB.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first()
  return c.json(created, 201)
})

app.put('/exams/:id', requireStaff, async (c) => {
  const id = c.req.param('id')
  const { name, subject, exam_date, max_marks, class_id } = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE exams
    SET name = COALESCE(?, name),
        subject = COALESCE(?, subject),
        exam_date = COALESCE(?, exam_date),
        max_marks = COALESCE(?, max_marks),
        class_id = COALESCE(?, class_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name ?? null, subject ?? null, exam_date ?? null, max_marks ?? null, class_id ?? null, id).run()

  const updated: any = await c.env.DB.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/exams/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM exams WHERE id = ?').bind(id).run()
  return c.json({ message: 'Exam deleted successfully' })
})

// ── RESULTS ENDPOINTS ────────────────────────────────────────────────
app.get('/results/', requireStaff, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT r.*, s.name as student_name, s.roll_number, s.student_id as student_code,
           e.name as exam_name, e.subject, e.max_marks
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN exams e ON r.exam_id = e.id
    ORDER BY r.created_at DESC
  `).all()
  return c.json(results || [])
})

app.get('/results/exam/:exam_id', async (c) => {
  const examId = c.req.param('exam_id')
  const { results } = await c.env.DB.prepare(`
    SELECT r.*, s.name as student_name, s.roll_number, s.student_id as student_code,
           e.name as exam_name, e.subject, e.max_marks
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN exams e ON r.exam_id = e.id
    WHERE r.exam_id = ?
    ORDER BY s.name ASC
  `).bind(examId).all()
  return c.json(results || [])
})

app.get('/results/me', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const student: any = await c.env.DB.prepare(
    'SELECT id FROM students WHERE user_id = ? OR id = ?'
  ).bind(sub, sub).first()

  if (!student) return c.json({ detail: 'Student profile not found' }, 404)

  const { results } = await c.env.DB.prepare(`
    SELECT r.*, e.name as exam_name, e.subject, e.exam_date, e.max_marks
    FROM results r
    JOIN exams e ON r.exam_id = e.id
    WHERE r.student_id = ?
    ORDER BY e.exam_date DESC
  `).bind(student.id).all()

  return c.json(results || [])
})

app.post('/results/bulk', requireStaff, async (c) => {
  const { exam_id, records } = await c.req.json()
  if (!exam_id || !records || !Array.isArray(records)) {
    return c.json({ detail: 'Invalid data' }, 400)
  }

  const statements = records.map((r: any) => {
    const id = crypto.randomUUID()
    return c.env.DB.prepare(`
      INSERT INTO results (id, student_id, exam_id, marks, grade, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, exam_id) DO UPDATE SET
        marks = excluded.marks,
        grade = excluded.grade,
        remarks = excluded.remarks,
        updated_at = CURRENT_TIMESTAMP
    `).bind(id, r.student_id, exam_id, r.marks, r.grade || null, r.remarks || null)
  })

  await c.env.DB.batch(statements)
  return c.json({ message: 'Results saved successfully' }, 201)
})

app.put('/results/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { marks, grade, remarks } = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE results
    SET marks = COALESCE(?, marks),
        grade = COALESCE(?, grade),
        remarks = COALESCE(?, remarks),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(marks ?? null, grade ?? null, remarks ?? null, id).run()

  const updated = await c.env.DB.prepare('SELECT * FROM results WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/results/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM results WHERE id = ?').bind(id).run()
  return c.json({ message: 'Result deleted' })
})

// ── FEES ENDPOINTS ───────────────────────────────────────────────────
app.get('/fees/class/:class_id', requireAdmin, async (c) => {
  const classId = c.req.param('class_id')
  const { results } = await c.env.DB.prepare(`
    SELECT f.*, s.name as student_name, s.roll_number, s.student_id as student_code
    FROM fee_payments f
    JOIN students s ON f.student_id = s.id
    WHERE s.class_id = ?
    ORDER BY s.name ASC
  `).bind(classId).all()
  return c.json(results || [])
})

app.get('/fees/me', requireAuth, async (c) => {
  const { sub } = c.get('userPayload')
  const student: any = await c.env.DB.prepare(
    'SELECT id FROM students WHERE user_id = ? OR id = ?'
  ).bind(sub, sub).first()

  if (!student) return c.json({ detail: 'Student profile not found' }, 404)

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM fee_payments WHERE student_id = ? ORDER BY due_date DESC
  `).bind(student.id).all()

  return c.json(results || [])
})

app.post('/fees/bulk', requireAdmin, async (c) => {
  const { class_id, amount, due_date, remarks, fee_type } = await c.req.json()

  const { results: students } = await c.env.DB.prepare(
    'SELECT id FROM students WHERE class_id = ?'
  ).bind(class_id).all()

  if (!students || students.length === 0) {
    return c.json({ detail: 'No students found in this class' }, 400)
  }

  const statements = students.map((s: any) => {
    const id = crypto.randomUUID()
    return c.env.DB.prepare(`
      INSERT INTO fee_payments (id, student_id, amount, paid_amount, fee_type, status, due_date, remarks)
      VALUES (?, ?, ?, 0, ?, 'Pending', ?, ?)
    `).bind(id, s.id, amount, fee_type || 'Tuition', due_date || null, remarks || null)
  })

  await c.env.DB.batch(statements)
  return c.json({ message: `Fees assigned to ${students.length} students` }, 201)
})

app.put('/fees/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { paid_amount, status, payment_date, remarks } = await c.req.json()

  await c.env.DB.prepare(`
    UPDATE fee_payments
    SET paid_amount = COALESCE(?, paid_amount),
        status = COALESCE(?, status),
        payment_date = COALESCE(?, payment_date),
        remarks = COALESCE(?, remarks),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(paid_amount ?? null, status ?? null, payment_date ?? null, remarks ?? null, id).run()

  const updated = await c.env.DB.prepare('SELECT * FROM fee_payments WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/fees/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM fee_payments WHERE id = ?').bind(id).run()
  return c.json({ message: 'Fee record deleted' })
})

// ── TIMETABLE ENDPOINTS ──────────────────────────────────────────────
app.get('/timetable/class/:class_id', async (c) => {
  const classId = c.req.param('class_id')
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, s.name as subject_name, s.code as subject_code,
           tc.name as teacher_name
    FROM timetable t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN teachers tc ON t.teacher_id = tc.id
    WHERE t.class_id = ?
    ORDER BY t.period_number ASC
  `).bind(classId).all()

  const formatted = (results || []).map((row: any) => ({
    ...row,
    subject: row.subject_id ? { id: row.subject_id, name: row.subject_name, code: row.subject_code } : null,
    teacher: row.teacher_id ? { id: row.teacher_id, name: row.teacher_name } : null
  }))
  return c.json(formatted)
})

app.get('/timetable/my', requireAuth, async (c) => {
  const { sub, role } = c.get('userPayload')

  if (role === 'teacher') {
    const teacher: any = await c.env.DB.prepare(
      'SELECT id FROM teachers WHERE user_id = ? OR id = ?'
    ).bind(sub, sub).first()
    if (!teacher) return c.json([])

    const { results } = await c.env.DB.prepare(`
      SELECT t.*, c.name as class_name, c.semester as class_semester, c.section as class_section,
             s.name as subject_name, s.code as subject_code
      FROM timetable t
      JOIN classes c ON t.class_id = c.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE t.teacher_id = ?
      ORDER BY t.day, t.period_number
    `).bind(teacher.id).all()
    return c.json(results || [])
  }

  // Student timetable
  const student: any = await c.env.DB.prepare(
    'SELECT class_id FROM students WHERE user_id = ? OR id = ?'
  ).bind(sub, sub).first()

  if (!student?.class_id) return c.json([])

  const { results } = await c.env.DB.prepare(`
    SELECT t.*, s.name as subject_name, s.code as subject_code,
           tc.name as teacher_name
    FROM timetable t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN teachers tc ON t.teacher_id = tc.id
    WHERE t.class_id = ?
    ORDER BY t.day, t.period_number
  `).bind(student.class_id).all()

  return c.json(results || [])
})

app.post('/timetable/', requireAdmin, async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO timetable (id, class_id, subject_id, teacher_id, day, period_number, start_time, end_time, room_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.class_id,
    body.subject_id || null,
    body.teacher_id || null,
    body.day,
    body.period_number,
    body.start_time || null,
    body.end_time || null,
    body.room_number || null
  ).run()

  const created = await c.env.DB.prepare('SELECT * FROM timetable WHERE id = ?').bind(id).first()
  return c.json(created, 201)
})

app.delete('/timetable/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM timetable WHERE id = ?').bind(id).run()
  return c.json({ message: 'Timetable entry deleted' })
})

// ── DIARY / HOMEWORK ENDPOINTS ──────────────────────────────────────
app.get('/diary/my', requireAuth, async (c) => {
  const { sub, role } = c.get('userPayload')
  // Ensure table exists
  try {
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS class_diary (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        subject_id TEXT,
        teacher_id TEXT,
        date TEXT NOT NULL,
        topics_covered TEXT NOT NULL,
        homework TEXT,
        due_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
  } catch (e) {}

  if (role === 'teacher') {
    const teacher: any = await c.env.DB.prepare('SELECT id FROM teachers WHERE user_id = ? OR id = ?').bind(sub, sub).first()
    if (!teacher) return c.json([])
    const { results } = await c.env.DB.prepare(`
      SELECT d.*, c.name as class_name, c.section as class_section, s.name as subject_name, t.name as teacher_name
      FROM class_diary d
      LEFT JOIN classes c ON d.class_id = c.id
      LEFT JOIN subjects s ON d.subject_id = s.id
      LEFT JOIN teachers t ON d.teacher_id = t.id
      WHERE d.teacher_id = ?
      ORDER BY d.date DESC, d.created_at DESC
    `).bind(teacher.id).all()
    return c.json(results || [])
  }

  // Student
  const student: any = await c.env.DB.prepare('SELECT class_id FROM students WHERE user_id = ? OR id = ?').bind(sub, sub).first()
  if (!student?.class_id) return c.json([])
  const { results } = await c.env.DB.prepare(`
    SELECT d.*, c.name as class_name, c.section as class_section, s.name as subject_name, t.name as teacher_name
    FROM class_diary d
    LEFT JOIN classes c ON d.class_id = c.id
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    WHERE d.class_id = ?
    ORDER BY d.date DESC, d.created_at DESC
  `).bind(student.class_id).all()
  return c.json(results || [])
})

app.get('/diary/class/:class_id', async (c) => {
  const classId = c.req.param('class_id')
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT d.*, c.name as class_name, c.section as class_section, s.name as subject_name, t.name as teacher_name
      FROM class_diary d
      LEFT JOIN classes c ON d.class_id = c.id
      LEFT JOIN subjects s ON d.subject_id = s.id
      LEFT JOIN teachers t ON d.teacher_id = t.id
      WHERE d.class_id = ?
      ORDER BY d.date DESC, d.created_at DESC
    `).bind(classId).all()
    return c.json(results || [])
  } catch (e) {
    return c.json([])
  }
})

app.post('/diary/', requireStaff, async (c) => {
  const { sub, role } = c.get('userPayload')
  const body = await c.req.json()
  const id = crypto.randomUUID()
  let teacherId = body.teacher_id || null

  if (!teacherId && role === 'teacher') {
    const teacher: any = await c.env.DB.prepare('SELECT id FROM teachers WHERE user_id = ? OR id = ?').bind(sub, sub).first()
    if (teacher) teacherId = teacher.id
  }

  try {
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS class_diary (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        subject_id TEXT,
        teacher_id TEXT,
        date TEXT NOT NULL,
        topics_covered TEXT NOT NULL,
        homework TEXT,
        due_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
  } catch (e) {}

  await c.env.DB.prepare(`
    INSERT INTO class_diary (id, class_id, subject_id, teacher_id, date, topics_covered, homework, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.class_id,
    body.subject_id || null,
    teacherId,
    body.date,
    body.topics_covered,
    body.homework || null,
    body.due_date || null
  ).run()

  const created = await c.env.DB.prepare(`
    SELECT d.*, c.name as class_name, c.section as class_section, s.name as subject_name, t.name as teacher_name
    FROM class_diary d
    LEFT JOIN classes c ON d.class_id = c.id
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    WHERE d.id = ?
  `).bind(id).first()

  return c.json(created, 201)
})

app.delete('/diary/:id', requireStaff, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM class_diary WHERE id = ?').bind(id).run()
  return c.json({ message: 'Diary entry deleted' })
})

export default app

