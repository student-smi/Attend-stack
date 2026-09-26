-- ============================================================
-- DUMMY DATA SEED FOR CLOUDFLARE D1
-- ============================================================

-- 1. CLASSES
INSERT OR REPLACE INTO classes (id, name, semester, section) VALUES
('cls-cs-sem1-a', 'Computer Science', 'Semester 1', 'A'),
('cls-cs-sem3-b', 'Computer Science', 'Semester 3', 'B'),
('cls-it-sem2-a', 'Information Technology', 'Semester 2', 'A'),
('cls-ec-sem4-a', 'Electronics & Comm.', 'Semester 4', 'A');

-- 2. SUBJECTS
INSERT OR REPLACE INTO subjects (id, name, code, description) VALUES
('sub-math-101', 'Engineering Mathematics I', 'MATH101', 'Calculus, Linear Algebra, and Differential Equations'),
('sub-cs-102',   'Data Structures & Algorithms', 'CS102', 'Arrays, Linked Lists, Trees, Graphs, Sorting & Searching'),
('sub-db-103',   'Database Management Systems', 'CS103', 'SQL, Relational Algebra, Normalization, and Transactions'),
('sub-web-104',  'Web Application Development', 'CS104', 'HTML5, CSS3, JavaScript, React, and REST APIs');

-- 3. USERS (Teachers & Students)
-- Passwords:
-- teacher123: $2a$10$aYW2ombnzsve0M.l1XF2re3J9syZryqurkxZjDxZvmMWWNmKrwbGC
-- student123: $2a$10$E/KBMHagievusK.ODxiEWOqLJGPVDsydoKmx5wV4BZptJO9o0bI9q
INSERT OR REPLACE INTO users (id, email, password, role, is_active) VALUES
('usr-tch-sharma', 'sharma@college.com', '$2a$10$aYW2ombnzsve0M.l1XF2re3J9syZryqurkxZjDxZvmMWWNmKrwbGC', 'teacher', 1),
('usr-tch-verma',  'verma@college.com',  '$2a$10$aYW2ombnzsve0M.l1XF2re3J9syZryqurkxZjDxZvmMWWNmKrwbGC', 'teacher', 1),
('usr-stu-rahul',  'rahul@college.com',  '$2a$10$E/KBMHagievusK.ODxiEWOqLJGPVDsydoKmx5wV4BZptJO9o0bI9q', 'student', 1),
('usr-stu-priya',  'priya@college.com',  '$2a$10$E/KBMHagievusK.ODxiEWOqLJGPVDsydoKmx5wV4BZptJO9o0bI9q', 'student', 1),
('usr-stu-amit',   'amit@college.com',   '$2a$10$E/KBMHagievusK.ODxiEWOqLJGPVDsydoKmx5wV4BZptJO9o0bI9q', 'student', 1),
('usr-stu-sneha',  'sneha@college.com',  '$2a$10$E/KBMHagievusK.ODxiEWOqLJGPVDsydoKmx5wV4BZptJO9o0bI9q', 'student', 1),
('usr-stu-rohan',  'rohan@college.com',  '$2a$10$E/KBMHagievusK.ODxiEWOqLJGPVDsydoKmx5wV4BZptJO9o0bI9q', 'student', 1);

-- 4. TEACHERS
INSERT OR REPLACE INTO teachers (id, name, email, phone, qualification, specialization, address, gender, user_id, subject_id) VALUES
('tch-sharma', 'Dr. Rajesh Sharma', 'sharma@college.com', '+91 9876543210', 'Ph.D. Computer Science', 'Algorithms & Data Structures', 'Staff Quarters B-12', 'Male', 'usr-tch-sharma', 'sub-cs-102'),
('tch-verma',  'Prof. Anjali Verma', 'verma@college.com',  '+91 9876543211', 'M.Tech Information Tech', 'Database Systems & Cloud', 'Faculty Enclave A-04', 'Female', 'usr-tch-verma',  'sub-db-103');

-- 5. STUDENTS
INSERT OR REPLACE INTO students (id, user_id, student_id, name, email, phone, gender, dob, address, class_id, roll_number) VALUES
('stu-001', 'usr-stu-rahul', 'STU2024001', 'Rahul Mehta', 'rahul@college.com', '+91 9823456781', 'Male',   '2004-05-15', 'Andheri West, Mumbai', 'cls-cs-sem1-a', '01'),
('stu-002', 'usr-stu-priya', 'STU2024002', 'Priya Patel', 'priya@college.com', '+91 9823456782', 'Female', '2004-08-20', 'Navrangpura, Ahmedabad', 'cls-cs-sem1-a', '02'),
('stu-003', 'usr-stu-amit',  'STU2024003', 'Amit Kumar',  'amit@college.com',  '+91 9823456783', 'Male',   '2004-01-10', 'Sector 15, Noida',     'cls-cs-sem1-a', '03'),
('stu-004', 'usr-stu-sneha', 'STU2024004', 'Sneha Gupta', 'sneha@college.com', '+91 9823456784', 'Female', '2004-11-25', 'Kothrud, Pune',       'cls-cs-sem1-a', '04'),
('stu-005', 'usr-stu-rohan', 'STU2024005', 'Rohan Singh', 'rohan@college.com', '+91 9823456785', 'Male',   '2003-09-12', 'Indiranagar, Bangalore', 'cls-cs-sem3-b', '01');

-- 6. EXAMS
INSERT OR REPLACE INTO exams (id, name, subject, exam_date, max_marks, class_id) VALUES
('ex-mid-math', 'Mid-Term Examination', 'Mathematics I', '2026-10-15', 100, 'cls-cs-sem1-a'),
('ex-mid-dsa',  'Mid-Term Examination', 'Data Structures', '2026-10-18', 100, 'cls-cs-sem1-a'),
('ex-unit-db',  'Unit Test 1',          'DBMS',            '2026-10-22', 50,  'cls-cs-sem1-a'),
('ex-final-web', 'End-Term Project',    'Web Technologies', '2026-11-10', 100, 'cls-cs-sem1-a');

-- 7. RESULTS
INSERT OR REPLACE INTO results (id, student_id, exam_id, marks, grade, remarks) VALUES
('res-001', 'stu-001', 'ex-mid-math', 85, 'A',  'Good analytical approach'),
('res-002', 'stu-002', 'ex-mid-math', 94, 'A+', 'Outstanding problem solving'),
('res-003', 'stu-003', 'ex-mid-math', 72, 'B+', 'Consistent effort, practice calculus'),
('res-004', 'stu-004', 'ex-mid-math', 68, 'B',  'Needs more practice with formulas'),

('res-005', 'stu-001', 'ex-mid-dsa', 88, 'A',  'Clear understanding of Trees & Graphs'),
('res-006', 'stu-002', 'ex-mid-dsa', 96, 'A+', 'Perfect implementation of algorithms'),
('res-007', 'stu-003', 'ex-mid-dsa', 80, 'A',  'Very good logic'),
('res-008', 'stu-004', 'ex-mid-dsa', 75, 'B+', 'Good, work on space complexity');

-- 8. ATTENDANCE (Recent 5 days)
INSERT OR REPLACE INTO attendance (id, student_id, class_id, date, status, marked_by) VALUES
('att-001', 'stu-001', 'cls-cs-sem1-a', '2026-09-22', 'Present', 'admin-root-uuid-0001'),
('att-002', 'stu-002', 'cls-cs-sem1-a', '2026-09-22', 'Present', 'admin-root-uuid-0001'),
('att-003', 'stu-003', 'cls-cs-sem1-a', '2026-09-22', 'Absent',  'admin-root-uuid-0001'),
('att-004', 'stu-004', 'cls-cs-sem1-a', '2026-09-22', 'Present', 'admin-root-uuid-0001'),

('att-005', 'stu-001', 'cls-cs-sem1-a', '2026-09-23', 'Present', 'admin-root-uuid-0001'),
('att-006', 'stu-002', 'cls-cs-sem1-a', '2026-09-23', 'Present', 'admin-root-uuid-0001'),
('att-007', 'stu-003', 'cls-cs-sem1-a', '2026-09-23', 'Present', 'admin-root-uuid-0001'),
('att-008', 'stu-004', 'cls-cs-sem1-a', '2026-09-23', 'Late',    'admin-root-uuid-0001'),

('att-009', 'stu-001', 'cls-cs-sem1-a', '2026-09-24', 'Present', 'admin-root-uuid-0001'),
('att-010', 'stu-002', 'cls-cs-sem1-a', '2026-09-24', 'Present', 'admin-root-uuid-0001'),
('att-011', 'stu-003', 'cls-cs-sem1-a', '2026-09-24', 'Present', 'admin-root-uuid-0001'),
('att-012', 'stu-004', 'cls-cs-sem1-a', '2026-09-24', 'Present', 'admin-root-uuid-0001'),

('att-013', 'stu-001', 'cls-cs-sem1-a', '2026-09-25', 'Present', 'admin-root-uuid-0001'),
('att-014', 'stu-002', 'cls-cs-sem1-a', '2026-09-25', 'Absent',  'admin-root-uuid-0001'),
('att-015', 'stu-003', 'cls-cs-sem1-a', '2026-09-25', 'Present', 'admin-root-uuid-0001'),
('att-016', 'stu-004', 'cls-cs-sem1-a', '2026-09-25', 'Present', 'admin-root-uuid-0001'),

('att-017', 'stu-001', 'cls-cs-sem1-a', '2026-09-26', 'Present', 'admin-root-uuid-0001'),
('att-018', 'stu-002', 'cls-cs-sem1-a', '2026-09-26', 'Present', 'admin-root-uuid-0001'),
('att-019', 'stu-003', 'cls-cs-sem1-a', '2026-09-26', 'Present', 'admin-root-uuid-0001'),
('att-020', 'stu-004', 'cls-cs-sem1-a', '2026-09-26', 'Present', 'admin-root-uuid-0001');

-- 9. FEES
INSERT OR REPLACE INTO fee_payments (id, student_id, amount, paid_amount, fee_type, status, due_date, payment_date, remarks) VALUES
('fee-001', 'stu-001', 50000, 50000, 'Tuition', 'Paid',    '2026-10-01', '2026-09-15', 'Online UPI Payment verified'),
('fee-002', 'stu-002', 50000, 50000, 'Tuition', 'Paid',    '2026-10-01', '2026-09-10', 'Net Banking payment cleared'),
('fee-003', 'stu-003', 50000, 25000, 'Tuition', 'Partial', '2026-10-01', '2026-09-20', 'Installment 1 paid, 2nd due in Nov'),
('fee-004', 'stu-004', 50000, 0,     'Tuition', 'Pending', '2026-10-01', NULL,         'Fee reminder sent');

-- 10. TIMETABLE
INSERT OR REPLACE INTO timetable (id, class_id, subject_id, teacher_id, day, period_number, start_time, end_time, room_number) VALUES
('tt-001', 'cls-cs-sem1-a', 'sub-cs-102',  'tch-sharma', 'Monday',    1, '09:00', '09:50', 'Lecture Hall 101'),
('tt-002', 'cls-cs-sem1-a', 'sub-db-103',  'tch-verma',  'Monday',    2, '10:00', '10:50', 'Computer Lab 2'),
('tt-003', 'cls-cs-sem1-a', 'sub-math-101', NULL,        'Monday',    3, '11:00', '11:50', 'Room 203'),
('tt-004', 'cls-cs-sem1-a', 'sub-web-104', NULL,        'Tuesday',   1, '09:00', '09:50', 'Web Tech Lab'),
('tt-005', 'cls-cs-sem1-a', 'sub-cs-102',  'tch-sharma', 'Tuesday',   2, '10:00', '10:50', 'Lecture Hall 101'),
('tt-006', 'cls-cs-sem1-a', 'sub-db-103',  'tch-verma',  'Wednesday', 1, '09:00', '09:50', 'Computer Lab 2');

-- 11. CLASS DIARY & HOMEWORK
INSERT OR REPLACE INTO class_diary (id, class_id, subject_id, teacher_id, date, topics_covered, homework, due_date) VALUES
('dry-001', 'cls-cs-sem1-a', 'sub-cs-102', 'tch-sharma', '2026-09-26', 'Chapter 3: Binary Search Trees - Insertion and In-order Traversal', 'Solve Questions 1 to 5 from Tutorial Sheet 3. Draw BST for given dataset.', '2026-09-28'),
('dry-002', 'cls-cs-sem1-a', 'sub-db-103', 'tch-verma',  '2026-09-25', 'Chapter 4: SQL Joins - Inner Join, Left Outer Join, and Subqueries', 'Write 5 SQL queries for customer-order database from textbook page 112.', '2026-09-27');

