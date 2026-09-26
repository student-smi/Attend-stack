-- ============================================================
-- COLLEGE STUDENT MANAGEMENT SYSTEM
-- Cloudflare D1 (SQLite) Schema
-- ============================================================

-- Table 1: users
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin', 'student', 'teacher')),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Table 2: classes
CREATE TABLE IF NOT EXISTS classes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    semester    TEXT NOT NULL,
    section     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, semester, section)
);

-- Table 3: subjects
CREATE TABLE IF NOT EXISTS subjects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE,
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: teachers
CREATE TABLE IF NOT EXISTS teachers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE,
    phone           TEXT,
    qualification   TEXT,
    specialization  TEXT,
    address         TEXT,
    gender          TEXT,
    user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    subject_id      TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_subject_id ON teachers(subject_id);

-- Table 5: students
CREATE TABLE IF NOT EXISTS students (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    student_id  TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT,
    gender      TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
    dob         TEXT,
    address     TEXT,
    class_id    TEXT REFERENCES classes(id) ON DELETE SET NULL,
    roll_number TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id  ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email    ON students(email);

-- Table 6: exams
CREATE TABLE IF NOT EXISTS exams (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    subject     TEXT NOT NULL,
    exam_date   TEXT NOT NULL,
    max_marks   INTEGER NOT NULL DEFAULT 100,
    class_id    TEXT REFERENCES classes(id) ON DELETE SET NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exams_date     ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);

-- Table 7: attendance
CREATE TABLE IF NOT EXISTS attendance (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present', 'Absent', 'Late')),
    marked_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id   ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON attendance(date);

-- Table 8: results
CREATE TABLE IF NOT EXISTS results (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    marks       INTEGER NOT NULL CHECK (marks >= 0),
    grade       TEXT,
    remarks     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, exam_id)
);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id    ON results(exam_id);

-- Table 9: fee_payments
CREATE TABLE IF NOT EXISTS fee_payments (
    id           TEXT PRIMARY KEY,
    student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount       INTEGER NOT NULL,
    paid_amount  INTEGER NOT NULL DEFAULT 0,
    fee_type     TEXT NOT NULL DEFAULT 'Tuition',
    status       TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Paid', 'Pending', 'Partial')),
    due_date     TEXT,
    payment_date TEXT,
    remarks      TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fee_student_id ON fee_payments(student_id);

-- Table 10: timetable
CREATE TABLE IF NOT EXISTS timetable (
    id            TEXT PRIMARY KEY,
    class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id    TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id    TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    day           TEXT NOT NULL CHECK(day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    period_number INTEGER NOT NULL,
    start_time    TEXT,
    end_time      TEXT,
    room_number   TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON timetable(class_id);

-- Table 11: class_diary
CREATE TABLE IF NOT EXISTS class_diary (
    id             TEXT PRIMARY KEY,
    class_id       TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id     TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id     TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    date           TEXT NOT NULL,
    topics_covered TEXT NOT NULL,
    homework       TEXT,
    due_date       TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_class_diary_class_id ON class_diary(class_id);
CREATE INDEX IF NOT EXISTS idx_class_diary_date     ON class_diary(date);

-- Default Admin User (admin@college.com / admin123)
INSERT OR IGNORE INTO users (id, email, password, role, is_active) VALUES (
    'admin-root-uuid-0001',
    'admin@college.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin',
    1
);
