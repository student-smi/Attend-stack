-- ============================================================
-- COLLEGE STUDENT MANAGEMENT SYSTEM
-- Supabase PostgreSQL Schema
-- ============================================================
-- Run this entire script in Supabase SQL Editor
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'student');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');


-- ============================================================
-- TABLE 1: users
-- Stores login credentials for both admin and students
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,    -- bcrypt hashed
    role        user_role NOT NULL DEFAULT 'student',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast login lookup
CREATE INDEX idx_users_email ON users(email);


-- ============================================================
-- TABLE 2: classes
-- Defines college classes / sections
-- (Created before students because students reference it)
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,       -- e.g. "Computer Science"
    semester    VARCHAR(50) NOT NULL,        -- e.g. "Semester 3"
    section     VARCHAR(10) NOT NULL,        -- e.g. "A", "B"
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, semester, section)
);


-- ============================================================
-- TABLE 3: students
-- Stores student profile data
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,  -- linked login account (nullable)
    student_id  VARCHAR(50) NOT NULL UNIQUE,   -- display ID e.g. "STU2024001"
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    gender      gender_type,
    dob         DATE,
    address     TEXT,
    class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
    roll_number VARCHAR(50),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX idx_students_class_id  ON students(class_id);
CREATE INDEX idx_students_user_id   ON students(user_id);
CREATE INDEX idx_students_email     ON students(email);


-- ============================================================
-- TABLE 4: exams
-- Stores exam schedule and details
-- ============================================================
CREATE TABLE IF NOT EXISTS exams (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,         -- e.g. "Mid-Term Exam"
    subject     VARCHAR(100) NOT NULL,         -- e.g. "Mathematics"
    exam_date   DATE NOT NULL,
    max_marks   INTEGER NOT NULL DEFAULT 100,
    class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,  -- optional: exam for specific class
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exams_date     ON exams(exam_date);
CREATE INDEX idx_exams_class_id ON exams(class_id);


-- ============================================================
-- TABLE 5: attendance
-- Tracks daily attendance per student per class
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    status      attendance_status NOT NULL DEFAULT 'Present',
    marked_by   UUID REFERENCES users(id) ON DELETE SET NULL,   -- admin who marked it
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id, date)   -- one record per student per class per day
);

CREATE INDEX idx_attendance_student_id  ON attendance(student_id);
CREATE INDEX idx_attendance_class_id    ON attendance(class_id);
CREATE INDEX idx_attendance_date        ON attendance(date);


-- ============================================================
-- TABLE 6: results
-- Stores exam results for each student
-- ============================================================
CREATE TABLE IF NOT EXISTS results (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    marks       INTEGER NOT NULL,
    grade       VARCHAR(5),           -- e.g. "A+", "B", "F"
    remarks     TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, exam_id),      -- one result per student per exam
    CONSTRAINT valid_marks CHECK (marks >= 0)
);

CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_results_exam_id    ON results(exam_id);


-- ============================================================
-- TABLE 7: class_diary
-- Stores daily homework and class diary
-- ============================================================
CREATE TABLE IF NOT EXISTS class_diary (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id     UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id     UUID REFERENCES teachers(id) ON DELETE SET NULL,
    date           DATE NOT NULL,
    topics_covered TEXT NOT NULL,
    homework       TEXT,
    due_date       DATE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_class_diary_class_id ON class_diary(class_id);
CREATE INDEX idx_class_diary_date     ON class_diary(date);

-- ============================================================
-- TABLE 12: quizzes
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    subject          VARCHAR(100) NOT NULL,
    class_id         UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    total_marks      INTEGER NOT NULL DEFAULT 10,
    questions_json   TEXT NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quizzes_class_id   ON quizzes(class_id);
CREATE INDEX idx_quizzes_teacher_id ON quizzes(teacher_id);

-- ============================================================
-- TABLE 13: quiz_submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id             UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score               INTEGER NOT NULL,
    total_marks         INTEGER NOT NULL,
    answers_json        TEXT NOT NULL,
    time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
    submitted_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_id, student_id)
);

CREATE INDEX idx_quiz_submissions_quiz    ON quiz_submissions(quiz_id);
CREATE INDEX idx_quiz_submissions_student ON quiz_submissions(student_id);

-- ============================================================
-- TABLE 14: leave_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_type  VARCHAR(20) NOT NULL CHECK(applicant_type IN ('student', 'teacher')),
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES teachers(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type      VARCHAR(50) NOT NULL CHECK(leave_type IN ('Sick', 'Casual', 'Emergency', 'Vacation', 'Other')),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    reason          TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    review_remarks  TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leave_student_id ON leave_requests(student_id);
CREATE INDEX idx_leave_teacher_id ON leave_requests(teacher_id);
CREATE INDEX idx_leave_status     ON leave_requests(status);




-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_results_updated_at
    BEFORE UPDATE ON results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- SEED DATA (for testing)
-- ============================================================

-- Admin user (password: "admin123" — change before production!)
-- bcrypt hash of "admin123"
INSERT INTO users (id, email, password, role) VALUES
(
    uuid_generate_v4(),
    'admin@college.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCBY9QR8Q8Yk.hJZ5M2HnWy',  -- admin123
    'admin'
);

-- Sample classes
INSERT INTO classes (id, name, semester, section) VALUES
    (uuid_generate_v4(), 'Computer Science', 'Semester 1', 'A'),
    (uuid_generate_v4(), 'Computer Science', 'Semester 3', 'B'),
    (uuid_generate_v4(), 'Electronics',      'Semester 2', 'A'),
    (uuid_generate_v4(), 'Mechanical',       'Semester 4', 'C');

-- Sample exams
INSERT INTO exams (name, subject, exam_date, max_marks) VALUES
    ('Mid-Term',   'Mathematics',         CURRENT_DATE + 7,  100),
    ('Mid-Term',   'Physics',             CURRENT_DATE + 10, 100),
    ('Unit Test 1','Data Structures',     CURRENT_DATE + 14, 50),
    ('Final Exam', 'Operating Systems',   CURRENT_DATE + 30, 100);


-- ============================================================
-- USEFUL VIEWS (optional but handy for admin dashboard)
-- ============================================================

-- View: attendance percentage per student
CREATE OR REPLACE VIEW student_attendance_summary AS
SELECT
    s.id            AS student_id,
    s.name          AS student_name,
    s.student_id    AS student_code,
    c.name          AS class_name,
    COUNT(a.id)                                         AS total_classes,
    COUNT(CASE WHEN a.status = 'Present' THEN 1 END)   AS present_count,
    COUNT(CASE WHEN a.status = 'Absent'  THEN 1 END)   AS absent_count,
    ROUND(
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0
        / NULLIF(COUNT(a.id), 0), 2
    )                                                   AS attendance_percentage
FROM students s
LEFT JOIN classes c    ON s.class_id = c.id
LEFT JOIN attendance a ON a.student_id = s.id
GROUP BY s.id, s.name, s.student_id, c.name;


-- View: student results with exam info
CREATE OR REPLACE VIEW student_results_detail AS
SELECT
    r.id            AS result_id,
    s.name          AS student_name,
    s.student_id    AS student_code,
    e.name          AS exam_name,
    e.subject,
    e.exam_date,
    e.max_marks,
    r.marks,
    r.grade,
    r.remarks,
    ROUND(r.marks * 100.0 / NULLIF(e.max_marks, 0), 2) AS percentage
FROM results r
JOIN students s ON r.student_id = s.id
JOIN exams e    ON r.exam_id    = e.id;


-- ============================================================
-- VERIFY: Check all tables were created
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
