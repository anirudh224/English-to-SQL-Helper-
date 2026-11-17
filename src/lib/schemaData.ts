export interface ColumnMeta {
  name: string;
  type: string;
  constraints: string;
  meaning: string;
}

export interface TableMeta {
  name: 'departments' | 'students' | 'subjects' | 'faculty' | 'marks';
  title: string;
  description: string;
  columns: ColumnMeta[];
  relationships: string[];
}

export const SCHEMA_DDL = `CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name TEXT UNIQUE NOT NULL,
    hod_name TEXT NOT NULL,
    building TEXT
);

CREATE TABLE IF NOT EXISTS students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    department_id INTEGER NOT NULL,
    admission_year INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS subjects (
    subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_code TEXT UNIQUE NOT NULL,
    subject_name TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    department_id INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS faculty (
    faculty_id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    designation TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS marks (
    mark_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    faculty_id INTEGER NOT NULL,
    exam_type TEXT CHECK (exam_type IN ('Internal', 'Midterm', 'Final')),
    marks_obtained REAL NOT NULL CHECK (marks_obtained >= 0 AND marks_obtained <= 100),
    exam_date DATE,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);`;

export const SEED_SQL = `INSERT INTO departments (department_id, department_name, hod_name, building) VALUES
(1, 'Computer Science', 'Dr. Rajesh Kulkarni', 'Turing Block'),
(2, 'Information Technology', 'Dr. Meera Deshmukh', 'Shannon Block'),
(3, 'Electronics', 'Dr. Arvind Nair', 'Tesla Block'),
(4, 'Mechanical', 'Dr. Suresh Verma', 'Visvesvaraya Block'),
(5, 'Civil', 'Dr. Kavita Iyer', 'Ramanujan Block');

INSERT INTO students (student_id, roll_number, full_name, gender, date_of_birth, email, phone, department_id, admission_year) VALUES
(1, 'CS2023001', 'Aarav Sharma', 'Male', '2005-03-14', 'aarav.sharma@college.edu', '9810101001', 1, 2023),
(2, 'CS2023002', 'Ananya Patel', 'Female', '2005-07-22', 'ananya.patel@college.edu', '9810101002', 1, 2023),
(3, 'CS2022003', 'Rohan Gupta', 'Male', '2004-11-08', 'rohan.gupta@college.edu', '9810101003', 1, 2022),
(4, 'CS2024004', 'Priya Krishnan', 'Female', '2006-01-19', 'priya.krishnan@college.edu', '9810101004', 1, 2024),
(5, 'CS2023005', 'Siddharth Menon', 'Male', '2005-05-30', 'siddharth.menon@college.edu', '9810101005', 1, 2023),
(6, 'CS2024006', 'Ishita Chatterjee', 'Female', '2006-04-11', 'ishita.chatterjee@college.edu', '9810101006', 1, 2024),
(7, 'IT2023001', 'Vikram Joshi', 'Male', '2005-09-03', 'vikram.joshi@college.edu', '9810102001', 2, 2023),
(8, 'IT2023002', 'Neha Reddy', 'Female', '2005-12-15', 'neha.reddy@college.edu', '9810102002', 2, 2023),
(9, 'IT2022003', 'Aditya Tiwari', 'Male', '2004-08-27', 'aditya.tiwari@college.edu', '9810102003', 2, 2022),
(10, 'IT2024004', 'Sneha Kulkarni', 'Female', '2006-02-09', 'sneha.kulkarni@college.edu', '9810102004', 2, 2024),
(11, 'IT2023005', 'Karan Malhotra', 'Male', '2005-06-21', 'karan.malhotra@college.edu', '9810102005', 2, 2023),
(12, 'EC2023001', 'Divya Subramanian', 'Female', '2005-10-04', 'divya.subramanian@college.edu', '9810103001', 3, 2023),
(13, 'EC2022002', 'Rahul Bhatia', 'Male', '2004-03-17', 'rahul.bhatia@college.edu', '9810103002', 3, 2022),
(14, 'EC2024003', 'Pooja Hegde', 'Female', '2006-07-29', 'pooja.hegde@college.edu', '9810103003', 3, 2024),
(15, 'EC2023004', 'Nikhil Bansal', 'Male', '2005-01-12', 'nikhil.bansal@college.edu', '9810103004', 3, 2023),
(16, 'ME2023001', 'Arjun Deshpande', 'Male', '2005-04-25', 'arjun.deshpande@college.edu', '9810104001', 4, 2023),
(17, 'ME2022002', 'Meenakshi Sundaram', 'Female', '2004-06-18', 'meenakshi.s@college.edu', '9810104002', 4, 2022),
(18, 'ME2024003', 'Varun Chauhan', 'Male', '2006-09-14', 'varun.chauhan@college.edu', '9810104003', 4, 2024),
(19, 'ME2023004', 'Tanvi Gokhale', 'Female', '2005-11-23', 'tanvi.gokhale@college.edu', '9810104004', 4, 2023),
(20, 'CE2023001', 'Harsh Vardhan', 'Male', '2005-02-06', 'harsh.vardhan@college.edu', '9810105001', 5, 2023),
(21, 'CE2022002', 'Rituja Pawar', 'Female', '2004-12-01', 'rituja.pawar@college.edu', '9810105002', 5, 2022),
(22, 'CE2024003', 'Devansh Mishra', 'Other', '2006-05-16', 'devansh.mishra@college.edu', '9810105003', 5, 2024);

INSERT INTO subjects (subject_id, subject_code, subject_name, credits, department_id) VALUES
(1, 'CS301', 'DBMS', 4, 1),
(2, 'CS302', 'Operating Systems', 4, 1),
(3, 'CS201', 'Data Structures', 4, 1),
(4, 'IT201', 'Python Programming', 3, 2),
(5, 'IT301', 'Computer Networks', 4, 2),
(6, 'IT302', 'Web Technologies', 3, 2),
(7, 'EC301', 'Digital Electronics', 4, 3),
(8, 'EC302', 'Signal Processing', 3, 3),
(9, 'ME301', 'Thermodynamics', 4, 4),
(10, 'CE301', 'Structural Analysis', 4, 5);

INSERT INTO faculty (faculty_id, faculty_name, email, phone, designation, department_id) VALUES
(1, 'Prof. Amitabh Sen', 'amitabh.sen@college.edu', '9820201001', 'Professor', 1),
(2, 'Dr. Sunita Rao', 'sunita.rao@college.edu', '9820201002', 'Associate Professor', 1),
(3, 'Mr. Vivek Kulkarni', 'vivek.kulkarni@college.edu', '9820201003', 'Assistant Professor', 1),
(4, 'Dr. Pradeep Menon', 'pradeep.menon@college.edu', '9820202001', 'Professor', 2),
(5, 'Ms. Anjali Kapoor', 'anjali.kapoor@college.edu', '9820202002', 'Assistant Professor', 2),
(6, 'Dr. Rameshwar Jha', 'rameshwar.jha@college.edu', '9820203001', 'Associate Professor', 3),
(7, 'Ms. Deepika Pillai', 'deepika.pillai@college.edu', '9820203002', 'Assistant Professor', 3),
(8, 'Dr. Sanjay Deshpande', 'sanjay.d@college.edu', '9820204001', 'Professor', 4),
(9, 'Mr. Manoj Tiwari', 'manoj.tiwari@college.edu', '9820204002', 'Assistant Professor', 4),
(10, 'Dr. Nandini Bose', 'nandini.bose@college.edu', '9820205001', 'Associate Professor', 5),
(11, 'Mr. Gaurav Shetty', 'gaurav.shetty@college.edu', '9820205002', 'Assistant Professor', 5);

INSERT INTO marks (mark_id, student_id, subject_id, faculty_id, exam_type, marks_obtained, exam_date) VALUES
(1, 1, 1, 1, 'Final', 91.5, '2025-05-12'),
(2, 1, 2, 2, 'Final', 84.0, '2025-05-14'),
(3, 1, 3, 3, 'Midterm', 88.0, '2025-03-10'),
(4, 1, 4, 4, 'Internal', 92.0, '2025-02-18'),
(5, 2, 1, 1, 'Final', 95.0, '2025-05-12'),
(6, 2, 2, 2, 'Final', 89.5, '2025-05-14'),
(7, 2, 3, 3, 'Midterm', 91.0, '2025-03-10'),
(8, 2, 5, 4, 'Final', 86.0, '2025-05-16'),
(9, 3, 1, 1, 'Final', 76.0, '2025-05-12'),
(10, 3, 2, 2, 'Midterm', 68.5, '2025-03-12'),
(11, 3, 3, 3, 'Final', 79.0, '2025-05-15'),
(12, 4, 1, 1, 'Midterm', 82.0, '2025-03-11'),
(13, 4, 2, 2, 'Internal', 77.5, '2025-02-19'),
(14, 4, 3, 3, 'Final', 85.0, '2025-05-15'),
(15, 5, 1, 1, 'Final', 63.0, '2025-05-12'),
(16, 5, 2, 2, 'Final', 58.0, '2025-05-14'),
(17, 5, 3, 3, 'Internal', 71.0, '2025-02-20'),
(18, 6, 3, 3, 'Final', 87.5, '2025-05-15'),
(19, 6, 4, 4, 'Midterm', 90.0, '2025-03-13'),
(20, 7, 4, 4, 'Final', 84.0, '2025-05-18'),
(21, 7, 5, 5, 'Final', 78.5, '2025-05-16'),
(22, 7, 6, 5, 'Midterm', 81.0, '2025-03-14'),
(23, 7, 1, 1, 'Final', 83.0, '2025-05-12'),
(24, 8, 4, 4, 'Final', 93.0, '2025-05-18'),
(25, 8, 5, 5, 'Final', 88.0, '2025-05-16'),
(26, 8, 6, 5, 'Final', 91.5, '2025-05-20'),
(27, 8, 1, 1, 'Midterm', 79.0, '2025-03-11'),
(28, 9, 4, 4, 'Midterm', 36.0, '2025-03-13'),
(29, 9, 5, 5, 'Final', 52.0, '2025-05-16'),
(30, 9, 6, 5, 'Internal', 64.0, '2025-02-22'),
(31, 10, 4, 4, 'Final', 86.5, '2025-05-18'),
(32, 10, 5, 5, 'Midterm', 74.0, '2025-03-15'),
(33, 10, 6, 5, 'Final', 88.0, '2025-05-20'),
(34, 11, 4, 4, 'Internal', 72.0, '2025-02-18'),
(35, 11, 5, 5, 'Final', 67.5, '2025-05-16'),
(36, 11, 1, 1, 'Final', 38.0, '2025-05-12'),
(37, 12, 7, 6, 'Final', 90.0, '2025-05-19'),
(38, 12, 8, 7, 'Final', 85.5, '2025-05-21'),
(39, 12, 4, 4, 'Midterm', 78.0, '2025-03-13'),
(40, 13, 7, 6, 'Midterm', 69.0, '2025-03-16'),
(41, 13, 8, 7, 'Final', 73.5, '2025-05-21'),
(42, 13, 5, 5, 'Internal', 61.0, '2025-02-21'),
(43, 14, 7, 6, 'Final', 94.0, '2025-05-19'),
(44, 14, 8, 7, 'Midterm', 89.0, '2025-03-17'),
(45, 15, 7, 6, 'Final', 34.5, '2025-05-19'),
(46, 15, 8, 7, 'Internal', 48.0, '2025-02-23'),
(47, 16, 9, 8, 'Final', 81.0, '2025-05-22'),
(48, 16, 4, 4, 'Final', 74.5, '2025-05-18'),
(49, 16, 9, 9, 'Midterm', 76.0, '2025-03-18'),
(50, 17, 9, 8, 'Final', 88.5, '2025-05-22'),
(51, 17, 4, 4, 'Internal', 79.0, '2025-02-18'),
(52, 18, 9, 9, 'Midterm', 39.0, '2025-03-18'),
(53, 18, 9, 8, 'Final', 55.0, '2025-05-22'),
(54, 19, 9, 8, 'Final', 83.0, '2025-05-22'),
(55, 19, 4, 4, 'Final', 80.5, '2025-05-18'),
(56, 20, 10, 10, 'Final', 77.0, '2025-05-23'),
(57, 20, 4, 4, 'Midterm', 66.0, '2025-03-13'),
(58, 20, 10, 11, 'Internal', 72.5, '2025-02-24'),
(59, 21, 10, 10, 'Final', 89.0, '2025-05-23'),
(60, 21, 10, 11, 'Midterm', 84.5, '2025-03-19'),
(61, 22, 10, 10, 'Final', 35.0, '2025-05-23'),
(62, 22, 4, 4, 'Internal', 59.0, '2025-02-18'),
(63, 1, 5, 5, 'Final', 89.0, '2025-05-16'),
(64, 2, 4, 4, 'Final', 96.0, '2025-05-18'),
(65, 4, 5, 5, 'Final', 80.0, '2025-05-16'),
(66, 6, 2, 2, 'Midterm', 83.5, '2025-03-12'),
(67, 10, 1, 1, 'Final', 87.0, '2025-05-12'),
(68, 12, 1, 1, 'Midterm', 81.5, '2025-03-11');`;

export const TABLES_META: TableMeta[] = [
  {
    name: 'departments',
    title: 'Departments',
    description: 'Academic departments offering undergraduate engineering programs.',
    columns: [
      { name: 'department_id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT', meaning: 'Unique department identifier' },
      { name: 'department_name', type: 'TEXT', constraints: 'UNIQUE NOT NULL', meaning: 'Official department name (e.g., Computer Science)' },
      { name: 'hod_name', type: 'TEXT', constraints: 'NOT NULL', meaning: 'Head of Department full name' },
      { name: 'building', type: 'TEXT', constraints: 'NULLABLE', meaning: 'Campus building housing the department' },
    ],
    relationships: [
      'One department has many students (students.department_id)',
      'One department offers many subjects (subjects.department_id)',
      'One department employs many faculty members (faculty.department_id)',
    ],
  },
  {
    name: 'students',
    title: 'Students',
    description: 'Enrolled undergraduate student directory with demographic and admission metadata.',
    columns: [
      { name: 'student_id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT', meaning: 'Unique student identifier' },
      { name: 'roll_number', type: 'TEXT', constraints: 'UNIQUE NOT NULL', meaning: 'University roll number (e.g., CS2023001)' },
      { name: 'full_name', type: 'TEXT', constraints: 'NOT NULL', meaning: 'Student full legal name' },
      { name: 'gender', type: 'TEXT', constraints: "CHECK (gender IN ('Male', 'Female', 'Other'))", meaning: 'Student gender category' },
      { name: 'date_of_birth', type: 'DATE', constraints: 'NULLABLE', meaning: 'Date of birth in YYYY-MM-DD format' },
      { name: 'email', type: 'TEXT', constraints: 'UNIQUE NOT NULL', meaning: 'Institutional email address' },
      { name: 'phone', type: 'TEXT', constraints: 'NULLABLE', meaning: '10-digit mobile contact number' },
      { name: 'department_id', type: 'INTEGER', constraints: 'NOT NULL FK -> departments', meaning: 'Enrolled department ID' },
      { name: 'admission_year', type: 'INTEGER', constraints: 'NOT NULL', meaning: 'Year of admission (e.g., 2022–2024)' },
    ],
    relationships: [
      'Belongs to one department (students.department_id -> departments.department_id)',
      'Has zero or more marks records (marks.student_id)',
    ],
  },
  {
    name: 'subjects',
    title: 'Subjects',
    description: 'Course catalog mapped to academic departments and credit weights.',
    columns: [
      { name: 'subject_id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT', meaning: 'Unique subject identifier' },
      { name: 'subject_code', type: 'TEXT', constraints: 'UNIQUE NOT NULL', meaning: 'Course code (e.g., CS301)' },
      { name: 'subject_name', type: 'TEXT', constraints: 'NOT NULL', meaning: 'Course title (e.g., DBMS, Operating Systems)' },
      { name: 'credits', type: 'INTEGER', constraints: 'NOT NULL CHECK (credits > 0)', meaning: 'Academic credit hours (3 or 4)' },
      { name: 'department_id', type: 'INTEGER', constraints: 'NOT NULL FK -> departments', meaning: 'Offering department ID' },
    ],
    relationships: [
      'Belongs to one department (subjects.department_id -> departments.department_id)',
      'Referenced by exam records (marks.subject_id)',
    ],
  },
  {
    name: 'faculty',
    title: 'Faculty',
    description: 'Teaching staff and examiners assigned across departments.',
    columns: [
      { name: 'faculty_id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT', meaning: 'Unique faculty identifier' },
      { name: 'faculty_name', type: 'TEXT', constraints: 'NOT NULL', meaning: 'Instructor full name with title' },
      { name: 'email', type: 'TEXT', constraints: 'UNIQUE NOT NULL', meaning: 'Official faculty email' },
      { name: 'phone', type: 'TEXT', constraints: 'NULLABLE', meaning: 'Contact phone number' },
      { name: 'designation', type: 'TEXT', constraints: 'NOT NULL', meaning: 'Academic rank (Professor, Associate Professor, Assistant Professor)' },
      { name: 'department_id', type: 'INTEGER', constraints: 'NOT NULL FK -> departments', meaning: 'Affiliated department ID' },
    ],
    relationships: [
      'Belongs to one department (faculty.department_id -> departments.department_id)',
      'Evaluates exam records (marks.faculty_id)',
    ],
  },
  {
    name: 'marks',
    title: 'Marks',
    description: 'Examination scores linking students, subjects, and evaluating faculty.',
    columns: [
      { name: 'mark_id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT', meaning: 'Unique mark record identifier' },
      { name: 'student_id', type: 'INTEGER', constraints: 'NOT NULL FK -> students', meaning: 'Student who appeared for the exam' },
      { name: 'subject_id', type: 'INTEGER', constraints: 'NOT NULL FK -> subjects', meaning: 'Subject evaluated' },
      { name: 'faculty_id', type: 'INTEGER', constraints: 'NOT NULL FK -> faculty', meaning: 'Evaluating faculty member' },
      { name: 'exam_type', type: 'TEXT', constraints: "CHECK (exam_type IN ('Internal', 'Midterm', 'Final'))", meaning: 'Assessment stage' },
      { name: 'marks_obtained', type: 'REAL', constraints: 'NOT NULL CHECK (0 <= marks <= 100)', meaning: 'Numeric score out of 100' },
      { name: 'exam_date', type: 'DATE', constraints: 'NULLABLE', meaning: 'Exam date in YYYY-MM-DD format' },
    ],
    relationships: [
      'References students(student_id), subjects(subject_id), and faculty(faculty_id)',
    ],
  },
];
