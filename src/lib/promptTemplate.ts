import { SCHEMA_DDL } from './schemaData';

export interface FewShotExample {
  id: number;
  category: string;
  english: string;
  sql: string;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    id: 1,
    category: 'JOIN + Filter',
    english: 'Show all students in the Computer Science department.',
    sql: `SELECT s.full_name, s.roll_number, d.department_name
FROM students s
JOIN departments d ON s.department_id = d.department_id
WHERE d.department_name = 'Computer Science'
ORDER BY s.full_name;`,
  },
  {
    id: 2,
    category: 'GROUP BY + AVG',
    english: 'Find the average marks obtained in each subject.',
    sql: `SELECT sub.subject_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks
FROM marks m
JOIN subjects sub ON m.subject_id = sub.subject_id
GROUP BY sub.subject_name
ORDER BY average_marks DESC;`,
  },
  {
    id: 3,
    category: 'Multi-Table JOIN',
    english: 'List students who scored more than 80 in DBMS.',
    sql: `SELECT s.full_name, s.roll_number, m.marks_obtained
FROM students s
JOIN marks m ON s.student_id = m.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id
WHERE sub.subject_name = 'DBMS'
AND m.marks_obtained > 80
ORDER BY m.marks_obtained DESC;`,
  },
  {
    id: 4,
    category: 'COUNT + GROUP BY',
    english: 'Show the number of students in every department.',
    sql: `SELECT d.department_name, COUNT(s.student_id) AS student_count
FROM departments d
LEFT JOIN students s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name
ORDER BY student_count DESC;`,
  },
  {
    id: 5,
    category: 'Top Scorer (ORDER BY + LIMIT)',
    english: 'Find the highest scorer in Operating Systems.',
    sql: `SELECT s.full_name, s.roll_number, m.marks_obtained
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id
WHERE sub.subject_name = 'Operating Systems'
ORDER BY m.marks_obtained DESC
LIMIT 1;`,
  },
  {
    id: 6,
    category: 'Numeric Filter',
    english: 'Find students admitted in the year 2023.',
    sql: `SELECT s.roll_number, s.full_name, d.department_name, s.admission_year
FROM students s
JOIN departments d ON s.department_id = d.department_id
WHERE s.admission_year = 2023
ORDER BY s.roll_number;`,
  },
  {
    id: 7,
    category: 'Faculty Lookup',
    english: 'Find all faculty members in the Computer Science department.',
    sql: `SELECT f.faculty_name, f.designation, f.email
FROM faculty f
JOIN departments d ON f.department_id = d.department_id
WHERE d.department_name = 'Computer Science'
ORDER BY f.faculty_name;`,
  },
  {
    id: 8,
    category: 'Subject Credits',
    english: 'Find subjects with more than 3 credits.',
    sql: `SELECT sub.subject_code, sub.subject_name, sub.credits, d.department_name
FROM subjects sub
JOIN departments d ON sub.department_id = d.department_id
WHERE sub.credits > 3
ORDER BY sub.subject_code;`,
  },
  {
    id: 9,
    category: 'Student Average',
    english: 'Find the average marks of Aarav Sharma.',
    sql: `SELECT s.full_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks
FROM students s
JOIN marks m ON s.student_id = m.student_id
WHERE s.full_name = 'Aarav Sharma'
GROUP BY s.student_id, s.full_name;`,
  },
  {
    id: 10,
    category: 'Threshold Filter',
    english: 'Find students who scored below 40 in any exam.',
    sql: `SELECT DISTINCT s.roll_number, s.full_name, sub.subject_name, m.marks_obtained
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id
WHERE m.marks_obtained < 40
ORDER BY m.marks_obtained ASC;`,
  },
  {
    id: 11,
    category: 'Total Count',
    english: 'Find the total number of marks records in the database.',
    sql: `SELECT COUNT(*) AS total_marks_records
FROM marks;`,
  },
  {
    id: 12,
    category: 'Top Department Average',
    english: 'Find the department with the highest average marks.',
    sql: `SELECT d.department_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN departments d ON s.department_id = d.department_id
GROUP BY d.department_id, d.department_name
ORDER BY average_marks DESC
LIMIT 1;`,
  },
  {
    id: 13,
    category: 'LEFT JOIN Anti-Pattern',
    english: 'Find students who have not appeared for the DBMS exam.',
    sql: `SELECT s.roll_number, s.full_name, d.department_name
FROM students s
JOIN departments d ON s.department_id = d.department_id
LEFT JOIN marks m ON s.student_id = m.student_id
  AND m.subject_id = (SELECT subject_id FROM subjects WHERE subject_name = 'DBMS')
WHERE m.mark_id IS NULL
ORDER BY s.roll_number;`,
  },
];

export const PROMPT_RULES = [
  'Use SQLite syntax only.',
  'Generate only one SQL query.',
  'Generate only a SELECT statement (or WITH CTE ending in SELECT).',
  'Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, ATTACH, or PRAGMA.',
  'Never use semicolons inside the generated query except one final semicolon.',
  'Use proper JOINs instead of comma-separated joins.',
  'Use table aliases for readability.',
  'Use ROUND(value, 2) for averages when appropriate.',
  'Return NULL-safe results where required.',
  'If the question is unsafe or unclear, return: -- Unable to generate a safe SQL query.',
  'Do not explain the SQL in the response. Do not add markdown formatting or code fences.',
];

export const COLUMN_MEANINGS = `- departments: department_id (PK), department_name (unique: 'Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'), hod_name (Head of Department), building (campus block)
- students: student_id (PK), roll_number (unique ID like 'CS2023001'), full_name, gender ('Male', 'Female', 'Other'), date_of_birth (YYYY-MM-DD), email, phone, department_id (FK -> departments), admission_year (integer e.g. 2022, 2023, 2024)
- subjects: subject_id (PK), subject_code (e.g. 'CS301'), subject_name (e.g. 'DBMS', 'Operating Systems', 'Data Structures', 'Python Programming', 'Computer Networks', 'Web Technologies', 'Digital Electronics', 'Signal Processing', 'Thermodynamics', 'Structural Analysis'), credits (3 or 4), department_id (FK -> departments)
- faculty: faculty_id (PK), faculty_name, email, phone, designation ('Professor', 'Associate Professor', 'Assistant Professor'), department_id (FK -> departments)
- marks: mark_id (PK), student_id (FK -> students), subject_id (FK -> subjects), faculty_id (FK -> faculty), exam_type ('Internal', 'Midterm', 'Final'), marks_obtained (0 to 100), exam_date (YYYY-MM-DD)`;

export function buildEnglishToSqlPrompt(userQuestion: string): string {
  const examplesBlock = FEW_SHOT_EXAMPLES.map(
    (ex) => `Example ${ex.id}:\nEnglish: ${ex.english}\nSQL:\n${ex.sql}`
  ).join('\n\n');

  const rulesBlock = PROMPT_RULES.map((rule) => `- ${rule}`).join('\n');

  return `<role>
You are an expert SQLite database engineer. Convert the user's English question into a single safe, read-only SQLite SELECT query for the student database.
</role>

<schema>
${SCHEMA_DDL}

Column Meanings & Valid Values:
${COLUMN_MEANINGS}
</schema>

<rules>
${rulesBlock}
</rules>

<examples>
${examplesBlock}
</examples>

<question>
${userQuestion.trim()}
</question>

<output_format>
Return only the SQL query.
</output_format>`;
}
