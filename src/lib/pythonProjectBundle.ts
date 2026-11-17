import { SCHEMA_DDL, SEED_SQL } from './schemaData';

export interface ProjectFileItem {
  filename: string;
  language: 'python' | 'sql' | 'text' | 'markdown';
  summary: string;
  code: string;
}

export interface TestCaseSpec {
  id: string;
  title: string;
  category: 'Functional' | 'Security' | 'Edge Case';
  input: string;
  expectedOutcome: string;
}

export interface VivaQuestion {
  q: string;
  a: string;
}

const DATABASE_PY = `"""
database.py - Creates student.db with 5 related tables, inserts realistic sample data,
and exposes a strict read-only SQLite connection helper.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path("student.db")


def get_writable_connection(db_path: str | Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def get_readonly_connection(db_path: str | Path = DB_PATH) -> sqlite3.Connection:
    resolved = Path(db_path).resolve()
    if not resolved.exists():
        raise FileNotFoundError("Database file has not been initialized.")
    uri = f"file:{resolved.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=5.0)
    conn.execute("PRAGMA query_only = ON;")
    return conn


def create_tables(conn: sqlite3.Connection) -> None:
    schema_sql = """
    CREATE TABLE IF NOT EXISTS departments (
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
    );
    """
    conn.executescript(schema_sql)


def seed_database(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) FROM departments;").fetchone()[0]
    if count > 0:
        return

    departments = [
        (1, "Computer Science", "Dr. Rajesh Kulkarni", "Turing Block"),
        (2, "Information Technology", "Dr. Meera Deshmukh", "Shannon Block"),
        (3, "Electronics", "Dr. Arvind Nair", "Tesla Block"),
        (4, "Mechanical", "Dr. Suresh Verma", "Visvesvaraya Block"),
        (5, "Civil", "Dr. Kavita Iyer", "Ramanujan Block"),
    ]
    conn.executemany(
        "INSERT INTO departments (department_id, department_name, hod_name, building) VALUES (?, ?, ?, ?);",
        departments,
    )

    students = [
        (1, "CS2023001", "Aarav Sharma", "Male", "2005-03-14", "aarav.sharma@college.edu", "9810101001", 1, 2023),
        (2, "CS2023002", "Ananya Patel", "Female", "2005-07-22", "ananya.patel@college.edu", "9810101002", 1, 2023),
        (3, "CS2022003", "Rohan Gupta", "Male", "2004-11-08", "rohan.gupta@college.edu", "9810101003", 1, 2022),
        (4, "CS2024004", "Priya Krishnan", "Female", "2006-01-19", "priya.krishnan@college.edu", "9810101004", 1, 2024),
        (5, "CS2023005", "Siddharth Menon", "Male", "2005-05-30", "siddharth.menon@college.edu", "9810101005", 1, 2023),
        (6, "CS2024006", "Ishita Chatterjee", "Female", "2006-04-11", "ishita.chatterjee@college.edu", "9810101006", 1, 2024),
        (7, "IT2023001", "Vikram Joshi", "Male", "2005-09-03", "vikram.joshi@college.edu", "9810102001", 2, 2023),
        (8, "IT2023002", "Neha Reddy", "Female", "2005-12-15", "neha.reddy@college.edu", "9810102002", 2, 2023),
        (9, "IT2022003", "Aditya Tiwari", "Male", "2004-08-27", "aditya.tiwari@college.edu", "9810102003", 2, 2022),
        (10, "IT2024004", "Sneha Kulkarni", "Female", "2006-02-09", "sneha.kulkarni@college.edu", "9810102004", 2, 2024),
        (11, "IT2023005", "Karan Malhotra", "Male", "2005-06-21", "karan.malhotra@college.edu", "9810102005", 2, 2023),
        (12, "EC2023001", "Divya Subramanian", "Female", "2005-10-04", "divya.subramanian@college.edu", "9810103001", 3, 2023),
        (13, "EC2022002", "Rahul Bhatia", "Male", "2004-03-17", "rahul.bhatia@college.edu", "9810103002", 3, 2022),
        (14, "EC2024003", "Pooja Hegde", "Female", "2006-07-29", "pooja.hegde@college.edu", "9810103003", 3, 2024),
        (15, "EC2023004", "Nikhil Bansal", "Male", "2005-01-12", "nikhil.bansal@college.edu", "9810103004", 3, 2023),
        (16, "ME2023001", "Arjun Deshpande", "Male", "2005-04-25", "arjun.deshpande@college.edu", "9810104001", 4, 2023),
        (17, "ME2022002", "Meenakshi Sundaram", "Female", "2004-06-18", "meenakshi.s@college.edu", "9810104002", 4, 2022),
        (18, "ME2024003", "Varun Chauhan", "Male", "2006-09-14", "varun.chauhan@college.edu", "9810104003", 4, 2024),
        (19, "ME2023004", "Tanvi Gokhale", "Female", "2005-11-23", "tanvi.gokhale@college.edu", "9810104004", 4, 2023),
        (20, "CE2023001", "Harsh Vardhan", "Male", "2005-02-06", "harsh.vardhan@college.edu", "9810105001", 5, 2023),
        (21, "CE2022002", "Rituja Pawar", "Female", "2004-12-01", "rituja.pawar@college.edu", "9810105002", 5, 2022),
        (22, "CE2024003", "Devansh Mishra", "Other", "2006-05-16", "devansh.mishra@college.edu", "9810105003", 5, 2024),
    ]
    conn.executemany(
        "INSERT INTO students (student_id, roll_number, full_name, gender, date_of_birth, email, phone, department_id, admission_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
        students,
    )

    subjects = [
        (1, "CS301", "DBMS", 4, 1),
        (2, "CS302", "Operating Systems", 4, 1),
        (3, "CS201", "Data Structures", 4, 1),
        (4, "IT201", "Python Programming", 3, 2),
        (5, "IT301", "Computer Networks", 4, 2),
        (6, "IT302", "Web Technologies", 3, 2),
        (7, "EC301", "Digital Electronics", 4, 3),
        (8, "EC302", "Signal Processing", 3, 3),
        (9, "ME301", "Thermodynamics", 4, 4),
        (10, "CE301", "Structural Analysis", 4, 5),
    ]
    conn.executemany(
        "INSERT INTO subjects (subject_id, subject_code, subject_name, credits, department_id) VALUES (?, ?, ?, ?, ?);",
        subjects,
    )

    faculty = [
        (1, "Prof. Amitabh Sen", "amitabh.sen@college.edu", "9820201001", "Professor", 1),
        (2, "Dr. Sunita Rao", "sunita.rao@college.edu", "9820201002", "Associate Professor", 1),
        (3, "Mr. Vivek Kulkarni", "vivek.kulkarni@college.edu", "9820201003", "Assistant Professor", 1),
        (4, "Dr. Pradeep Menon", "pradeep.menon@college.edu", "9820202001", "Professor", 2),
        (5, "Ms. Anjali Kapoor", "anjali.kapoor@college.edu", "9820202002", "Assistant Professor", 2),
        (6, "Dr. Rameshwar Jha", "rameshwar.jha@college.edu", "9820203001", "Associate Professor", 3),
        (7, "Ms. Deepika Pillai", "deepika.pillai@college.edu", "9820203002", "Assistant Professor", 3),
        (8, "Dr. Sanjay Deshpande", "sanjay.d@college.edu", "9820204001", "Professor", 4),
        (9, "Mr. Manoj Tiwari", "manoj.tiwari@college.edu", "9820204002", "Assistant Professor", 4),
        (10, "Dr. Nandini Bose", "nandini.bose@college.edu", "9820205001", "Associate Professor", 5),
        (11, "Mr. Gaurav Shetty", "gaurav.shetty@college.edu", "9820205002", "Assistant Professor", 5),
    ]
    conn.executemany(
        "INSERT INTO faculty (faculty_id, faculty_name, email, phone, designation, department_id) VALUES (?, ?, ?, ?, ?, ?);",
        faculty,
    )

    marks = [
        (1, 1, 1, 1, "Final", 91.5, "2025-05-12"),
        (2, 1, 2, 2, "Final", 84.0, "2025-05-14"),
        (3, 1, 3, 3, "Midterm", 88.0, "2025-03-10"),
        (4, 1, 4, 4, "Internal", 92.0, "2025-02-18"),
        (5, 2, 1, 1, "Final", 95.0, "2025-05-12"),
        (6, 2, 2, 2, "Final", 89.5, "2025-05-14"),
        (7, 2, 3, 3, "Midterm", 91.0, "2025-03-10"),
        (8, 2, 5, 4, "Final", 86.0, "2025-05-16"),
        (9, 3, 1, 1, "Final", 76.0, "2025-05-12"),
        (10, 3, 2, 2, "Midterm", 68.5, "2025-03-12"),
        (11, 3, 3, 3, "Final", 79.0, "2025-05-15"),
        (12, 4, 1, 1, "Midterm", 82.0, "2025-03-11"),
        (13, 4, 2, 2, "Internal", 77.5, "2025-02-19"),
        (14, 4, 3, 3, "Final", 85.0, "2025-05-15"),
        (15, 5, 1, 1, "Final", 63.0, "2025-05-12"),
        (16, 5, 2, 2, "Final", 58.0, "2025-05-14"),
        (17, 5, 3, 3, "Internal", 71.0, "2025-02-20"),
        (18, 6, 3, 3, "Final", 87.5, "2025-05-15"),
        (19, 6, 4, 4, "Midterm", 90.0, "2025-03-13"),
        (20, 7, 4, 4, "Final", 84.0, "2025-05-18"),
        (21, 7, 5, 5, "Final", 78.5, "2025-05-16"),
        (22, 7, 6, 5, "Midterm", 81.0, "2025-03-14"),
        (23, 7, 1, 1, "Final", 83.0, "2025-05-12"),
        (24, 8, 4, 4, "Final", 93.0, "2025-05-18"),
        (25, 8, 5, 5, "Final", 88.0, "2025-05-16"),
        (26, 8, 6, 5, "Final", 91.5, "2025-05-20"),
        (27, 8, 1, 1, "Midterm", 79.0, "2025-03-11"),
        (28, 9, 4, 4, "Midterm", 36.0, "2025-03-13"),
        (29, 9, 5, 5, "Final", 52.0, "2025-05-16"),
        (30, 9, 6, 5, "Internal", 64.0, "2025-02-22"),
        (31, 10, 4, 4, "Final", 86.5, "2025-05-18"),
        (32, 10, 5, 5, "Midterm", 74.0, "2025-03-15"),
        (33, 10, 6, 5, "Final", 88.0, "2025-05-20"),
        (34, 11, 4, 4, "Internal", 72.0, "2025-02-18"),
        (35, 11, 5, 5, "Final", 67.5, "2025-05-16"),
        (36, 11, 1, 1, "Final", 38.0, "2025-05-12"),
        (37, 12, 7, 6, "Final", 90.0, "2025-05-19"),
        (38, 12, 8, 7, "Final", 85.5, "2025-05-21"),
        (39, 12, 4, 4, "Midterm", 78.0, "2025-03-13"),
        (40, 13, 7, 6, "Midterm", 69.0, "2025-03-16"),
        (41, 13, 8, 7, "Final", 73.5, "2025-05-21"),
        (42, 13, 5, 5, "Internal", 61.0, "2025-02-21"),
        (43, 14, 7, 6, "Final", 94.0, "2025-05-19"),
        (44, 14, 8, 7, "Midterm", 89.0, "2025-03-17"),
        (45, 15, 7, 6, "Final", 34.5, "2025-05-19"),
        (46, 15, 8, 7, "Internal", 48.0, "2025-02-23"),
        (47, 16, 9, 8, "Final", 81.0, "2025-05-22"),
        (48, 16, 4, 4, "Final", 74.5, "2025-05-18"),
        (49, 16, 9, 9, "Midterm", 76.0, "2025-03-18"),
        (50, 17, 9, 8, "Final", 88.5, "2025-05-22"),
        (51, 17, 4, 4, "Internal", 79.0, "2025-02-18"),
        (52, 18, 9, 9, "Midterm", 39.0, "2025-03-18"),
        (53, 18, 9, 8, "Final", 55.0, "2025-05-22"),
        (54, 19, 9, 8, "Final", 83.0, "2025-05-22"),
        (55, 19, 4, 4, "Final", 80.5, "2025-05-18"),
        (56, 20, 10, 10, "Final", 77.0, "2025-05-23"),
        (57, 20, 4, 4, "Midterm", 66.0, "2025-03-13"),
        (58, 20, 10, 11, "Internal", 72.5, "2025-02-24"),
        (59, 21, 10, 10, "Final", 89.0, "2025-05-23"),
        (60, 21, 10, 11, "Midterm", 84.5, "2025-03-19"),
        (61, 22, 10, 10, "Final", 35.0, "2025-05-23"),
        (62, 22, 4, 4, "Internal", 59.0, "2025-02-18"),
        (63, 1, 5, 5, "Final", 89.0, "2025-05-16"),
        (64, 2, 4, 4, "Final", 96.0, "2025-05-18"),
        (65, 4, 5, 5, "Final", 80.0, "2025-05-16"),
        (66, 6, 2, 2, "Midterm", 83.5, "2025-03-12"),
        (67, 10, 1, 1, "Final", 87.0, "2025-05-12"),
        (68, 12, 1, 1, "Midterm", 81.5, "2025-03-11"),
    ]
    conn.executemany(
        "INSERT INTO marks (mark_id, student_id, subject_id, faculty_id, exam_type, marks_obtained, exam_date) VALUES (?, ?, ?, ?, ?, ?, ?);",
        marks,
    )
    conn.commit()


def init_database(db_path: str | Path = DB_PATH) -> Path:
    path = Path(db_path)
    with get_writable_connection(path) as conn:
        create_tables(conn)
        seed_database(conn)
    return path.resolve()


if __name__ == "__main__":
    created_path = init_database()
    print(f"Initialized SQLite database at: {created_path}")
`;

const SQL_GENERATOR_PY = `"""
sql_generator.py - Builds the few-shot schema-aware prompt and calls
either local Ollama or a free cloud LLM API (Gemini / Groq).
"""

from __future__ import annotations

import os
import re
from typing import Literal

import requests
from dotenv import load_dotenv

load_dotenv()

SCHEMA_BLOCK = """
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name TEXT UNIQUE NOT NULL,
    hod_name TEXT NOT NULL,
    building TEXT
);

CREATE TABLE students (
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

CREATE TABLE subjects (
    subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_code TEXT UNIQUE NOT NULL,
    subject_name TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    department_id INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE faculty (
    faculty_id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    designation TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE marks (
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
);
"""

FEW_SHOT_BLOCK = """
Example 1:
English: Show all students in the Computer Science department.
SQL:
SELECT s.full_name, s.roll_number, d.department_name
FROM students s
JOIN departments d ON s.department_id = d.department_id
WHERE d.department_name = 'Computer Science'
ORDER BY s.full_name;

Example 2:
English: Find the average marks obtained in each subject.
SQL:
SELECT sub.subject_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks
FROM marks m
JOIN subjects sub ON m.subject_id = sub.subject_id
GROUP BY sub.subject_name
ORDER BY average_marks DESC;

Example 3:
English: List students who scored more than 80 in DBMS.
SQL:
SELECT s.full_name, s.roll_number, m.marks_obtained
FROM students s
JOIN marks m ON s.student_id = m.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id
WHERE sub.subject_name = 'DBMS'
AND m.marks_obtained > 80
ORDER BY m.marks_obtained DESC;

Example 4:
English: Show the number of students in every department.
SQL:
SELECT d.department_name, COUNT(s.student_id) AS student_count
FROM departments d
LEFT JOIN students s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name
ORDER BY student_count DESC;

Example 5:
English: Find the highest scorer in Operating Systems.
SQL:
SELECT s.full_name, s.roll_number, m.marks_obtained
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id
WHERE sub.subject_name = 'Operating Systems'
ORDER BY m.marks_obtained DESC
LIMIT 1;

Example 6:
English: Find students admitted in 2023.
SQL:
SELECT s.roll_number, s.full_name, d.department_name, s.admission_year
FROM students s
JOIN departments d ON s.department_id = d.department_id
WHERE s.admission_year = 2023
ORDER BY s.roll_number;

Example 7:
English: Find faculty members in the Computer Science department.
SQL:
SELECT f.faculty_name, f.designation, f.email
FROM faculty f
JOIN departments d ON f.department_id = d.department_id
WHERE d.department_name = 'Computer Science'
ORDER BY f.faculty_name;

Example 8:
English: Find subjects with more than 3 credits.
SQL:
SELECT sub.subject_code, sub.subject_name, sub.credits
FROM subjects sub
WHERE sub.credits > 3
ORDER BY sub.subject_code;

Example 9:
English: Find the average marks of Aarav Sharma.
SQL:
SELECT s.full_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks
FROM students s
JOIN marks m ON s.student_id = m.student_id
WHERE s.full_name = 'Aarav Sharma'
GROUP BY s.student_id, s.full_name;

Example 10:
English: Find students who scored below 40.
SQL:
SELECT DISTINCT s.roll_number, s.full_name, sub.subject_name, m.marks_obtained
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN subjects sub ON m.subject_id = sub.subject_id
WHERE m.marks_obtained < 40
ORDER BY m.marks_obtained ASC;

Example 11:
English: Find the total number of marks records.
SQL:
SELECT COUNT(*) AS total_marks_records FROM marks;

Example 12:
English: Find the department with the highest average marks.
SQL:
SELECT d.department_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks
FROM marks m
JOIN students s ON m.student_id = s.student_id
JOIN departments d ON s.department_id = d.department_id
GROUP BY d.department_id, d.department_name
ORDER BY average_marks DESC
LIMIT 1;

Example 13:
English: Find students who have not appeared for DBMS.
SQL:
SELECT s.roll_number, s.full_name, d.department_name
FROM students s
JOIN departments d ON s.department_id = d.department_id
LEFT JOIN marks m ON s.student_id = m.student_id
  AND m.subject_id = (SELECT subject_id FROM subjects WHERE subject_name = 'DBMS')
WHERE m.mark_id IS NULL
ORDER BY s.roll_number;
"""


def build_prompt(user_question: str) -> str:
    return f"""<schema>
{SCHEMA_BLOCK}
</schema>

<rules>
- Use SQLite syntax only.
- Generate only one SQL query.
- Generate only a SELECT statement.
- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, ATTACH, or PRAGMA.
- Never use semicolons inside the generated query except one final semicolon.
- Use proper JOINs instead of comma-separated joins.
- Use table aliases for readability.
- Use ROUND() for averages when appropriate.
- Return NULL-safe results where required.
- If the question is unclear, return:
  -- Unable to generate a safe SQL query.
- Do not explain the SQL in the response.
- Do not add markdown formatting.
- Do not add code fences.
</rules>

<examples>
{FEW_SHOT_BLOCK}
</examples>

<question>
{user_question.strip()}
</question>

<output_format>
Return only the SQL query.
</output_format>"""


def clean_sql_output(raw_text: str) -> str:
    text = (raw_text or "").strip()
    fence = re.search(r"\`\`\`(?:sql|sqlite)?\\s*([\\s\\S]*?)\`\`\`", text, re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    text = re.sub(r"^sql\\s*:\\s*", "", text, flags=re.IGNORECASE).strip()
    return text


def _get_secret(name: str) -> str:
    """Reads an API key from environment variables or Streamlit secrets."""
    val = os.getenv(name, "").strip()
    if val:
        return val
    try:
        import streamlit as st

        secret_val = st.secrets.get(name, "")
        return str(secret_val).strip()
    except Exception:
        return ""


def generate_sql_ollama(prompt: str, model: str = "llama3.2", timeout_sec: int = 30) -> str:
    """Generates SQL using the local Ollama client or HTTP API."""
    base_url = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    try:
        import ollama

        client = ollama.Client(host=base_url, timeout=timeout_sec)
        result = client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.0},
        )
        content = result.get("message", {}).get("content", "")
        return clean_sql_output(content)
    except ImportError:
        pass
    except Exception as exc:
        raise RuntimeError(
            "Could not connect to local Ollama server. Ensure 'ollama serve' is running and the model is pulled."
        ) from exc

    try:
        resp = requests.post(
            f"{base_url}/api/chat",
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "options": {"temperature": 0.0},
            },
            timeout=timeout_sec,
        )
        resp.raise_for_status()
        content = resp.json().get("message", {}).get("content", "")
        return clean_sql_output(content)
    except requests.ConnectionError as exc:
        raise RuntimeError("Could not connect to local Ollama server. Ensure 'ollama serve' is running.") from exc
    except requests.Timeout as exc:
        raise RuntimeError("Ollama request timed out.") from exc
    except requests.RequestException as exc:
        raise RuntimeError("Ollama API returned an error response.") from exc


def generate_sql_free_api(prompt: str, model: str = "gemini-2.5-flash", timeout_sec: int = 30) -> str:
    """Generates SQL using a configured free cloud API (Google Gemini or Groq)."""
    gemini_key = _get_secret("GEMINI_API_KEY")
    groq_key = _get_secret("GROQ_API_KEY")

    if gemini_key:
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            f"?key={gemini_key}"
        )
        try:
            resp = requests.post(
                endpoint,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=timeout_sec,
            )
            resp.raise_for_status()
            candidates = resp.json().get("candidates", [])
            text = candidates[0]["content"]["parts"][0]["text"] if candidates else ""
            return clean_sql_output(text)
        except requests.RequestException as exc:
            raise RuntimeError("Gemini API request failed. Verify your GEMINI_API_KEY and model name.") from exc

    if groq_key:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}"},
                json={
                    "model": model or "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.0,
                },
                timeout=timeout_sec,
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"]
            return clean_sql_output(text)
        except requests.RequestException as exc:
            raise RuntimeError("Groq API request failed. Verify your GROQ_API_KEY and model name.") from exc

    raise RuntimeError(
        "No free API key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env or Streamlit secrets."
    )


def generate_sql(
    question: str,
    provider: Literal["Ollama", "Free API"] = "Ollama",
    model: str = "llama3.2",
) -> str:
    prompt = build_prompt(question)
    if provider == "Ollama":
        return generate_sql_ollama(prompt, model=model)
    return generate_sql_free_api(prompt, model=model)
`;

const SQL_EXECUTOR_PY = `"""
sql_executor.py - Strict SQL safety validator and read-only SQLite executor.
"""

from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path
from typing import Tuple

import pandas as pd

from database import get_readonly_connection

FORBIDDEN_KEYWORDS = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "ATTACH",
    "DETACH",
    "PRAGMA",
    "REPLACE",
    "TRUNCATE",
    "VACUUM",
    "REINDEX",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
    "LOAD_EXTENSION",
)

MAX_ROWS = 200
MAX_QUERY_SECONDS = 3.0


def _strip_string_literals(sql: str) -> str:
    cleaned = re.sub(r"'(?:''|[^'])*'", "''", sql)
    return re.sub(r'"(?:""|[^"])*"', '""', cleaned)


def validate_sql(sql: str) -> Tuple[bool, str, str]:
    """
    Validates that the generated SQL is a single safe read-only SELECT/WITH query.
    Returns (is_valid, sanitized_sql_or_empty, error_message_or_empty).
    """
    cleaned = (sql or "").strip()
    if not cleaned:
        return False, "", "Empty SQL query cannot be executed."

    if cleaned.startswith("-- Unable to generate a safe SQL query"):
        return False, "", "The question could not be mapped safely to the database schema."

    without_strings = _strip_string_literals(cleaned)
    if "--" in without_strings or "/*" in without_strings or "*/" in without_strings:
        return False, "", "SQL comments are blocked for security."

    body = re.sub(r";\\s*$", "", cleaned).strip()
    body_no_strings = _strip_string_literals(body)

    if ";" in body_no_strings:
        return False, "", "Multiple SQL statements are prohibited."

    if not re.match(r"^(SELECT|WITH)\\b", body, flags=re.IGNORECASE):
        return False, "", "Only read-only SELECT or WITH queries are allowed."

    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\\b{kw}\\b", body_no_strings, flags=re.IGNORECASE):
            return False, "", f"Unsafe SQL keyword blocked: {kw}"

    if not re.search(r"\\bLIMIT\\s+\\d+", body_no_strings, flags=re.IGNORECASE):
        body = f"{body} LIMIT {MAX_ROWS}"
    else:
        body = re.sub(
            r"\\bLIMIT\\s+(\\d+)(\\s+OFFSET\\s+\\d+)?\\s*$",
            lambda m: f"LIMIT {min(int(m.group(1)), MAX_ROWS)}{m.group(2) or ''}",
            body,
            flags=re.IGNORECASE,
        )

    return True, f"{body};", ""


def execute_safe_query(
    sql: str, db_path: str | Path = "student.db"
) -> Tuple[pd.DataFrame | None, str]:
    is_valid, safe_sql, err = validate_sql(sql)
    if not is_valid:
        return None, err

    conn: sqlite3.Connection | None = None
    try:
        conn = get_readonly_connection(db_path)
        start_time = time.monotonic()

        def timeout_handler() -> int:
            return 1 if (time.monotonic() - start_time) > MAX_QUERY_SECONDS else 0

        conn.set_progress_handler(timeout_handler, 1000)
        df = pd.read_sql_query(safe_sql, conn)
        if len(df) > MAX_ROWS:
            df = df.head(MAX_ROWS)
        return df, ""
    except sqlite3.OperationalError:
        return None, "Query execution failed due to invalid SQL syntax or read-only restriction."
    except sqlite3.Error:
        return None, "Database execution error occurred while running the query."
    except FileNotFoundError:
        return None, "Student database is not initialized yet."
    finally:
        if conn is not None:
            conn.close()


execute_sql = execute_safe_query
`;

const SPEECH_TO_TEXT_PY = `"""
speech_to_text.py - Converts recorded Streamlit microphone audio into English text
using OpenAI Whisper (offline speech recognition).
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any

import streamlit as st
import whisper

ALLOWED_WHISPER_MODELS = ("tiny", "base", "small")


@st.cache_resource(show_spinner=False)
def load_whisper_model(model_name: str = "base") -> Any:
    """Loads and caches the selected OpenAI Whisper model."""
    normalized = (model_name or "base").strip().lower()
    if normalized not in ALLOWED_WHISPER_MODELS:
        raise ValueError(
            f"Unsupported Whisper model '{model_name}'. Choose one of: {', '.join(ALLOWED_WHISPER_MODELS)}."
        )
    return whisper.load_model(normalized)


def transcribe_audio(audio_file: Any, model_name: str = "base") -> str:
    """
    Saves Streamlit UploadedFile/audio_input bytes to a temporary file,
    transcribes spoken English using Whisper, cleans up the temp file,
    and returns the stripped transcript text.
    """
    if audio_file is None:
        raise ValueError("No audio recorded. Please record an English question first.")

    audio_bytes = (
        audio_file.getvalue()
        if hasattr(audio_file, "getvalue")
        else audio_file.read()
    )
    if not audio_bytes:
        raise ValueError("Recorded audio clip is empty. Please try recording again.")

    file_name = getattr(audio_file, "name", "") or "recorded_question.wav"
    suffix = Path(file_name).suffix or ".wav"
    temp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            temp_path = tmp.name

        model = load_whisper_model(model_name)
        result = model.transcribe(temp_path, language="en", fp16=False)
        transcript = (result.get("text") or "").strip()

        if not transcript:
            raise ValueError(
                "Could not recognize clear English speech. Please speak clearly and record again."
            )

        return transcript
    except ValueError:
        raise
    except FileNotFoundError as exc:
        raise RuntimeError(
            "FFmpeg was not found on your system PATH. Please install FFmpeg to process microphone audio."
        ) from exc
    except Exception as exc:
        raise RuntimeError(f"Speech recognition failed: {exc}") from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
`;

const EVALUATION_PY = `"""
evaluation.py - Evaluates LLM accuracy across 40 predefined English questions
using result-based comparison against read-only SQLite execution.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any, List, Tuple

import pandas as pd

from database import init_database
from sql_executor import execute_safe_query, validate_sql
from sql_generator import generate_sql

EVALUATION_CASES: List[dict[str, Any]] = [
    {"id": 1, "question": "Show all departments and their HOD names.", "expected_sql": "SELECT department_name, hod_name, building FROM departments ORDER BY department_id;"},
    {"id": 2, "question": "List all subjects with their subject code and credits.", "expected_sql": "SELECT subject_code, subject_name, credits FROM subjects ORDER BY subject_id;"},
    {"id": 3, "question": "Find all students admitted in 2024.", "expected_sql": "SELECT roll_number, full_name, admission_year FROM students WHERE admission_year = 2024 ORDER BY roll_number;"},
    {"id": 4, "question": "List all female students with their roll numbers and emails.", "expected_sql": "SELECT roll_number, full_name, email FROM students WHERE gender = 'Female' ORDER BY full_name;"},
    {"id": 5, "question": "Find all faculty members with the designation Professor.", "expected_sql": "SELECT faculty_name, email, designation FROM faculty WHERE designation = 'Professor' ORDER BY faculty_name;"},
    {"id": 6, "question": "Show all subjects that carry 4 credits.", "expected_sql": "SELECT subject_code, subject_name, credits FROM subjects WHERE credits = 4 ORDER BY subject_code;"},
    {"id": 7, "question": "Find students whose full name starts with A.", "expected_sql": "SELECT roll_number, full_name FROM students WHERE full_name LIKE 'A%' ORDER BY full_name;"},
    {"id": 8, "question": "Find faculty members whose email contains college.edu and name starts with Dr.", "expected_sql": "SELECT faculty_name, designation, email FROM faculty WHERE faculty_name LIKE 'Dr.%' AND email LIKE '%college.edu' ORDER BY faculty_name;"},
    {"id": 9, "question": "List students born on or after 2006-01-01.", "expected_sql": "SELECT roll_number, full_name, date_of_birth FROM students WHERE date_of_birth >= '2006-01-01' ORDER BY date_of_birth;"},
    {"id": 10, "question": "Show all marks records from exams conducted in March 2025.", "expected_sql": "SELECT mark_id, student_id, subject_id, marks_obtained, exam_date FROM marks WHERE exam_date BETWEEN '2025-03-01' AND '2025-03-31' ORDER BY exam_date, mark_id;"},
    {"id": 11, "question": "Show the top 5 highest mark records across all exams.", "expected_sql": "SELECT s.full_name, sub.subject_name, m.exam_type, m.marks_obtained FROM marks m JOIN students s ON m.student_id = s.student_id JOIN subjects sub ON m.subject_id = sub.subject_id ORDER BY m.marks_obtained DESC LIMIT 5;"},
    {"id": 12, "question": "Show the 3 lowest marks recorded in the database.", "expected_sql": "SELECT s.full_name, sub.subject_name, m.marks_obtained FROM marks m JOIN students s ON m.student_id = s.student_id JOIN subjects sub ON m.subject_id = sub.subject_id ORDER BY m.marks_obtained ASC LIMIT 3;"},
    {"id": 13, "question": "List all students ordered from youngest to oldest by date of birth.", "expected_sql": "SELECT roll_number, full_name, date_of_birth FROM students ORDER BY date_of_birth DESC;"},
    {"id": 14, "question": "Show all distinct admission years present in the students table.", "expected_sql": "SELECT DISTINCT admission_year FROM students ORDER BY admission_year ASC;"},
    {"id": 15, "question": "List the distinct exam types recorded in marks.", "expected_sql": "SELECT DISTINCT exam_type FROM marks ORDER BY exam_type;"},
    {"id": 16, "question": "Find the total number of students enrolled.", "expected_sql": "SELECT COUNT(*) AS total_students FROM students;"},
    {"id": 17, "question": "Find the minimum, maximum, and average marks across all exams.", "expected_sql": "SELECT MIN(marks_obtained) AS min_marks, MAX(marks_obtained) AS max_marks, ROUND(AVG(marks_obtained), 2) AS avg_marks FROM marks;"},
    {"id": 18, "question": "Calculate the total sum of credits for all subjects in Computer Science.", "expected_sql": "SELECT SUM(sub.credits) AS total_credits FROM subjects sub JOIN departments d ON sub.department_id = d.department_id WHERE d.department_name = 'Computer Science';"},
    {"id": 19, "question": "Show the number of students in every department.", "expected_sql": "SELECT d.department_name, COUNT(s.student_id) AS student_count FROM departments d LEFT JOIN students s ON d.department_id = s.department_id GROUP BY d.department_id, d.department_name ORDER BY student_count DESC;"},
    {"id": 20, "question": "Find the average marks obtained in each subject.", "expected_sql": "SELECT sub.subject_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks FROM marks m JOIN subjects sub ON m.subject_id = sub.subject_id GROUP BY sub.subject_id, sub.subject_name ORDER BY average_marks DESC;"},
    {"id": 21, "question": "Count the number of students by gender.", "expected_sql": "SELECT gender, COUNT(*) AS student_count FROM students GROUP BY gender ORDER BY student_count DESC;"},
    {"id": 22, "question": "Show the number of faculty members in each department.", "expected_sql": "SELECT d.department_name, COUNT(f.faculty_id) AS faculty_count FROM departments d LEFT JOIN faculty f ON d.department_id = f.department_id GROUP BY d.department_id, d.department_name ORDER BY faculty_count DESC;"},
    {"id": 23, "question": "Find the average marks for each exam type.", "expected_sql": "SELECT exam_type, ROUND(AVG(marks_obtained), 2) AS average_marks FROM marks GROUP BY exam_type ORDER BY average_marks DESC;"},
    {"id": 24, "question": "Find subjects with an average mark greater than 80.", "expected_sql": "SELECT sub.subject_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks FROM marks m JOIN subjects sub ON m.subject_id = sub.subject_id GROUP BY sub.subject_id, sub.subject_name HAVING AVG(m.marks_obtained) > 80 ORDER BY average_marks DESC;"},
    {"id": 25, "question": "List students who have appeared in at least 4 exams.", "expected_sql": "SELECT s.roll_number, s.full_name, COUNT(m.mark_id) AS exam_count FROM students s JOIN marks m ON s.student_id = m.student_id GROUP BY s.student_id, s.roll_number, s.full_name HAVING COUNT(m.mark_id) >= 4 ORDER BY exam_count DESC;"},
    {"id": 26, "question": "Find departments that have more than 4 students enrolled.", "expected_sql": "SELECT d.department_name, COUNT(s.student_id) AS student_count FROM departments d JOIN students s ON d.department_id = s.department_id GROUP BY d.department_id, d.department_name HAVING COUNT(s.student_id) > 4 ORDER BY student_count DESC;"},
    {"id": 27, "question": "Show all students in the Computer Science department.", "expected_sql": "SELECT s.full_name, s.roll_number, d.department_name FROM students s JOIN departments d ON s.department_id = d.department_id WHERE d.department_name = 'Computer Science' ORDER BY s.full_name;"},
    {"id": 28, "question": "List all subjects offered by the Information Technology department.", "expected_sql": "SELECT sub.subject_code, sub.subject_name, sub.credits FROM subjects sub JOIN departments d ON sub.department_id = d.department_id WHERE d.department_name = 'Information Technology' ORDER BY sub.subject_code;"},
    {"id": 29, "question": "List students who scored more than 80 in DBMS.", "expected_sql": "SELECT s.full_name, s.roll_number, m.marks_obtained FROM students s JOIN marks m ON s.student_id = m.student_id JOIN subjects sub ON m.subject_id = sub.subject_id WHERE sub.subject_name = 'DBMS' AND m.marks_obtained > 80 ORDER BY m.marks_obtained DESC;"},
    {"id": 30, "question": "Show all marks evaluated by Prof. Amitabh Sen with student name and subject name.", "expected_sql": "SELECT s.full_name, sub.subject_name, m.exam_type, m.marks_obtained FROM marks m JOIN students s ON m.student_id = s.student_id JOIN subjects sub ON m.subject_id = sub.subject_id JOIN faculty f ON m.faculty_id = f.faculty_id WHERE f.faculty_name = 'Prof. Amitabh Sen' ORDER BY m.marks_obtained DESC;"},
    {"id": 31, "question": "Find the average marks of each department.", "expected_sql": "SELECT d.department_name, ROUND(AVG(m.marks_obtained), 2) AS average_marks FROM marks m JOIN students s ON m.student_id = s.student_id JOIN departments d ON s.department_id = d.department_id GROUP BY d.department_id, d.department_name ORDER BY average_marks DESC;"},
    {"id": 32, "question": "Show the highest scorer in Python Programming.", "expected_sql": "SELECT s.full_name, s.roll_number, m.marks_obtained FROM marks m JOIN students s ON m.student_id = s.student_id JOIN subjects sub ON m.subject_id = sub.subject_id WHERE sub.subject_name = 'Python Programming' ORDER BY m.marks_obtained DESC LIMIT 1;"},
    {"id": 33, "question": "Find students who have not appeared for the DBMS exam.", "expected_sql": "SELECT s.roll_number, s.full_name, d.department_name FROM students s JOIN departments d ON s.department_id = d.department_id LEFT JOIN marks m ON s.student_id = m.student_id AND m.subject_id = (SELECT subject_id FROM subjects WHERE subject_name = 'DBMS') WHERE m.mark_id IS NULL ORDER BY s.roll_number;"},
    {"id": 34, "question": "List all faculty members and the number of mark records they have evaluated, including zero.", "expected_sql": "SELECT f.faculty_name, COUNT(m.mark_id) AS evaluated_count FROM faculty f LEFT JOIN marks m ON f.faculty_id = m.faculty_id GROUP BY f.faculty_id, f.faculty_name ORDER BY evaluated_count DESC, f.faculty_name;"},
    {"id": 35, "question": "Find students whose marks in any exam are above the overall average marks of all exams.", "expected_sql": "SELECT DISTINCT s.roll_number, s.full_name, sub.subject_name, m.marks_obtained FROM marks m JOIN students s ON m.student_id = s.student_id JOIN subjects sub ON m.subject_id = sub.subject_id WHERE m.marks_obtained > (SELECT AVG(marks_obtained) FROM marks) ORDER BY m.marks_obtained DESC;"},
    {"id": 36, "question": "Find students enrolled in the same department as Aarav Sharma, excluding Aarav Sharma.", "expected_sql": "SELECT s.roll_number, s.full_name FROM students s WHERE s.department_id = (SELECT department_id FROM students WHERE full_name = 'Aarav Sharma') AND s.full_name != 'Aarav Sharma' ORDER BY s.full_name;"},
    {"id": 37, "question": "Find subjects that have an average mark higher than the overall average mark across all subjects.", "expected_sql": "SELECT sub.subject_name, ROUND(AVG(m.marks_obtained), 2) AS subject_avg FROM marks m JOIN subjects sub ON m.subject_id = sub.subject_id GROUP BY sub.subject_id, sub.subject_name HAVING AVG(m.marks_obtained) > (SELECT AVG(marks_obtained) FROM marks) ORDER BY subject_avg DESC;"},
    {"id": 38, "question": "Classify each DBMS mark record as Distinction (>=85), Pass (40-84), or Fail (<40).", "expected_sql": "SELECT s.full_name, m.marks_obtained, CASE WHEN m.marks_obtained >= 85 THEN 'Distinction' WHEN m.marks_obtained >= 40 THEN 'Pass' ELSE 'Fail' END AS grade_status FROM marks m JOIN students s ON m.student_id = s.student_id JOIN subjects sub ON m.subject_id = sub.subject_id WHERE sub.subject_name = 'DBMS' ORDER BY m.marks_obtained DESC;"},
    {"id": 39, "question": "Count how many mark records fall into Pass (>=40) versus Fail (<40).", "expected_sql": "SELECT CASE WHEN marks_obtained >= 40 THEN 'Pass' ELSE 'Fail' END AS result_status, COUNT(*) AS record_count FROM marks GROUP BY result_status ORDER BY record_count DESC;"},
    {"id": 40, "question": "Find students who scored below 40 in any exam along with their subject and department.", "expected_sql": "SELECT s.roll_number, s.full_name, d.department_name, sub.subject_name, m.marks_obtained FROM marks m JOIN students s ON m.student_id = s.student_id JOIN departments d ON s.department_id = d.department_id JOIN subjects sub ON m.subject_id = sub.subject_id WHERE m.marks_obtained < 40 ORDER BY m.marks_obtained ASC;"},
]


def _normalize_df(df: pd.DataFrame) -> List[Tuple[str, ...]]:
    rows: List[Tuple[str, ...]] = []
    for _, row in df.iterrows():
        normalized = []
        for val in row.tolist():
            if pd.isna(val):
                normalized.append("NULL")
            elif isinstance(val, float):
                normalized.append(str(int(val)) if val.is_integer() else str(round(val, 2)))
            else:
                normalized.append(str(val).strip().lower())
        rows.append(tuple(normalized))
    return sorted(rows)


def run_evaluation(
    provider: str = "Ollama",
    model: str = "llama3.2",
    db_path: str | Path = "student.db",
    report_path: str | Path = "evaluation_report.csv",
) -> dict[str, Any]:
    init_database(db_path)
    records = []
    correct_count = 0

    for item in EVALUATION_CASES:
        qid = item["id"]
        question = item["question"]
        expected_sql = item["expected_sql"]

        expected_df, expected_err = execute_safe_query(expected_sql, db_path)
        generated_sql = ""
        exec_status = "Failed"
        result_match = False
        is_correct = False

        try:
            generated_sql = generate_sql(question, provider=provider, model=model)  # type: ignore[arg-type]
            is_valid, safe_sql, val_err = validate_sql(generated_sql)
            if not is_valid:
                exec_status = f"Blocked: {val_err}"
            else:
                actual_df, exec_err = execute_safe_query(safe_sql, db_path)
                if exec_err or actual_df is None:
                    exec_status = f"SQL Error: {exec_err}"
                else:
                    exec_status = "Success"
                    if expected_err is None or expected_err == "":
                        if expected_df is not None and actual_df.shape == expected_df.shape:
                            result_match = _normalize_df(actual_df) == _normalize_df(expected_df)
                    is_correct = result_match
        except Exception as exc:
            exec_status = f"LLM Error: {exc}"

        if is_correct:
            correct_count += 1

        records.append({
            "Question ID": qid,
            "English question": question,
            "expected SQL": expected_sql,
            "generated SQL": generated_sql,
            "execution status": exec_status,
            "result match": result_match,
            "correctness": "Correct" if is_correct else "Incorrect",
        })

    total = len(EVALUATION_CASES)
    accuracy = round((correct_count / total) * 100, 2)

    with open(report_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)

    return {
        "total": total,
        "correct": correct_count,
        "incorrect": total - correct_count,
        "accuracy": accuracy,
        "records": records,
        "report_path": str(report_path),
    }


if __name__ == "__main__":
    summary = run_evaluation()
    print(f"Total questions: {summary['total']}")
    print(f"Correct answers: {summary['correct']}")
    print(f"Incorrect answers: {summary['incorrect']}")
    print(f"Accuracy percentage: {summary['accuracy']}%")
`;

const APP_PY = `"""
app.py - Streamlit web application for English-to-SQL Helper with Typed & Voice input.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st

from database import init_database
from evaluation import EVALUATION_CASES, run_evaluation
from speech_to_text import transcribe_audio
from sql_executor import execute_sql
from sql_generator import generate_sql

st.set_page_config(page_title="English-to-SQL Helper", layout="wide")

st.title("English-to-SQL Helper")
st.caption("Natural Language Query Interface for a 5-Table Student Database (Read-Only SQLite)")


def _run_sql_pipeline(question_text: str, provider: str, model_name: str, db_path: str) -> None:
    """Generates SQL from English text, validates it, and displays read-only results."""
    with st.spinner("Generating and validating SQLite query..."):
        generated_sql = generate_sql(
            question_text,
            provider=provider,  # type: ignore[arg-type]
            model=model_name,
        )
        st.subheader("Generated SQL Query")
        st.code(generated_sql, language="sql")

        df, error_msg = execute_sql(generated_sql, db_path=db_path)
        if error_msg:
            st.error(error_msg)
        elif df is not None:
            st.success(f"Returned {len(df)} row(s) in read-only mode.")
            st.dataframe(df, use_container_width=True)
            csv_bytes = df.to_csv(index=False).encode("utf-8")
            st.download_button(
                "Download Result as CSV",
                data=csv_bytes,
                file_name="query_result.csv",
                mime="text/csv",
            )


with st.sidebar:
    st.header("Configuration")
    input_mode = st.sidebar.radio(
        "Choose Input Method",
        ["Type Question", "Speak Question"],
    )
    whisper_model = st.sidebar.selectbox(
        "Speech Recognition Model",
        ["tiny", "base", "small"],
        index=1,
    )
    provider = st.selectbox("LLM Provider", ["Ollama", "Free API"])
    default_model = "llama3.2" if provider == "Ollama" else "gemini-2.5-flash"
    model_name = st.text_input("Model Name", value=default_model)
    db_path = st.text_input("Database File Path", value="student.db")

    if st.button("Load Sample Questions", use_container_width=True):
        st.session_state["show_samples"] = True

init_database(db_path)

tab_query, tab_eval = st.tabs(["Query Assistant", "Accuracy Evaluation (40 Questions)"])

with tab_query:
    if input_mode == "Type Question":
        if st.session_state.get("show_samples"):
            sample_list = [q["question"] for q in EVALUATION_CASES[:8]]
            chosen = st.selectbox("Choose a sample question:", sample_list)
            if st.button("Use Selected Question"):
                st.session_state["question_input"] = chosen

        user_question = st.text_area(
            "Enter your English question",
            key="question_input",
            placeholder="e.g., List students who scored more than 80 in DBMS.",
            height=90,
        )

        if st.button("Generate SQL", type="primary"):
            if not user_question.strip():
                st.error("Please enter an English question first.")
            else:
                try:
                    _run_sql_pipeline(user_question, provider, model_name, db_path)
                except Exception as exc:
                    st.error(str(exc))
    else:
        st.subheader("🎤 Speak Your Question")
        st.caption(
            "Record your database question in English. Speech is transcribed to text first "
            f"using Whisper ({whisper_model}), displayed for review, and then converted to SQL."
        )
        audio_file = st.audio_input("Record your question", sample_rate=16000)

        if audio_file is not None:
            st.audio(audio_file)

        if st.button("Convert Speech to SQL", type="primary"):
            if audio_file is None:
                st.error("Please record an English question using the microphone first.")
            else:
                try:
                    with st.spinner(f"Transcribing speech using Whisper ({whisper_model})..."):
                        recognized_text = transcribe_audio(audio_file, model_name=whisper_model)

                    st.subheader("Recognized English Question")
                    st.info(recognized_text)

                    _run_sql_pipeline(recognized_text, provider, model_name, db_path)
                except Exception as exc:
                    st.error(str(exc))

with tab_eval:
    st.subheader("Benchmark Suite: 40 Predefined Questions")
    if st.button("Run Accuracy Test on 40 Questions", type="primary"):
        with st.spinner("Evaluating 40 questions against read-only SQLite..."):
            summary = run_evaluation(provider=provider, model=model_name, db_path=db_path)
            col1, col2, col3 = st.columns(3)
            col1.metric("Accuracy", f"{summary['accuracy']}%")
            col2.metric("Correct Queries", summary["correct"])
            col3.metric("Incorrect Queries", summary["incorrect"])

            results_df = pd.DataFrame(summary["records"])
            st.dataframe(results_df, use_container_width=True)
            st.download_button(
                "Download Evaluation Report as CSV",
                data=results_df.to_csv(index=False).encode("utf-8"),
                file_name="evaluation_report.csv",
                mime="text/csv",
            )
`;

const REQUIREMENTS_TXT = `streamlit>=1.39.0
pandas>=2.2.0
ollama>=0.3.3
requests>=2.32.0
python-dotenv>=1.0.1
openai-whisper>=20240930
# Note: FFmpeg system package is also required by openai-whisper (see README.md)`;

const README_MD = `# English-to-SQL Helper: Natural Language Query Interface for a Student Database

## 1. Installation Steps
\`\`\`bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`

## 2. Ollama Installation (Local LLM)
1. Install Ollama from https://ollama.com/download
2. Pull the default model:
\`\`\`bash
ollama pull llama3.2
ollama serve
\`\`\`
Optional Free Cloud API: set \`GEMINI_API_KEY\` or \`GROQ_API_KEY\` in \`.env\`.

## 3. Create the SQLite Database
\`\`\`bash
python database.py
\`\`\`
This creates \`student.db\` with 5 tables (\`departments\`, \`students\`, \`subjects\`, \`faculty\`, \`marks\`), 22 students, 10 subjects, 11 faculty members, and 68 marks records.

## 4. Run Streamlit Application
\`\`\`bash
streamlit run app.py
\`\`\`

## Voice Input Feature
The application supports **Voice-Based English-to-SQL Query Generation** alongside the existing typed query interface:
1. In the Streamlit sidebar, select **Speak Question** under **Choose Input Method**.
2. Choose an OpenAI Whisper model size (**tiny**, **base**, or **small**) under **Speech Recognition Model**.
3. Click the microphone widget (\`st.audio_input\`) to record your English question and preview playback.
4. Click **Convert Speech to SQL**.
5. The app transcribes the speech to English text locally via \`speech_to_text.py\`, displays the recognized English text for review, and sends only that text to the existing few-shot SQL generator, safety validator, and read-only SQLite executor.

### Installing FFmpeg (Required for Whisper Audio Decoding)
- **Windows (PowerShell / Command Prompt):**
  \`\`\`powershell
  winget install Gyan.FFmpeg
  # Or via Chocolatey: choco install ffmpeg
  \`\`\`
  Restart your terminal after installation so \`ffmpeg\` is available on \`PATH\`.
- **macOS (Homebrew):**
  \`\`\`bash
  brew install ffmpeg
  \`\`\`
- **Ubuntu / Debian Linux:**
  \`\`\`bash
  sudo apt update && sudo apt install -y ffmpeg
  \`\`\`

## 5. Run 40-Question Accuracy Evaluation
\`\`\`bash
python evaluation.py
\`\`\`
Generates \`evaluation_report.csv\` and prints accuracy percentage.

## 6. Sample Questions
- Show all students in the Computer Science department.
- Find the average marks obtained in each subject.
- List students who scored more than 80 in DBMS.
- Show the number of students in every department.
- Find students who have not appeared for the DBMS exam.
`;

export const PYTHON_PROJECT_FILES: ProjectFileItem[] = [
  {
    filename: 'database.py',
    language: 'python',
    summary: 'Initializes student.db with 5 tables, foreign keys, sample Indian student/faculty/marks data, and read-only URI connector.',
    code: DATABASE_PY,
  },
  {
    filename: 'sql_generator.py',
    language: 'python',
    summary: 'Builds schema + 13 few-shot prompt template, calls local Ollama or free Gemini/Groq APIs, and strips markdown fences.',
    code: SQL_GENERATOR_PY,
  },
  {
    filename: 'sql_executor.py',
    language: 'python',
    summary: 'Implements validate_sql() security filter, execute_safe_query()/execute_sql() read-only runner, LIMIT 200 cap, and timeout.',
    code: SQL_EXECUTOR_PY,
  },
  {
    filename: 'speech_to_text.py',
    language: 'python',
    summary: 'Transcribes microphone audio to English text via cached OpenAI Whisper (tiny, base, small) with safe temp-file cleanup.',
    code: SPEECH_TO_TEXT_PY,
  },
  {
    filename: 'evaluation.py',
    language: 'python',
    summary: 'Runs all 40 predefined English questions, compares result sets against expected SQL, calculates accuracy %, and writes evaluation_report.csv.',
    code: EVALUATION_PY,
  },
  {
    filename: 'app.py',
    language: 'python',
    summary: 'Streamlit UI with Type Question & Speak Question (Whisper) sidebar modes, CSV download, and 40-question evaluation page.',
    code: APP_PY,
  },
  {
    filename: 'schema_and_seed.sql',
    language: 'sql',
    summary: 'Standalone SQL file to create all 5 tables and populate sample records.',
    code: `${SCHEMA_DDL}\n\n${SEED_SQL}`,
  },
  {
    filename: 'requirements.txt',
    language: 'text',
    summary: 'Pinned Python dependencies for running locally on a college laptop.',
    code: REQUIREMENTS_TXT,
  },
  {
    filename: 'README.md',
    language: 'markdown',
    summary: 'Setup, Ollama installation, database seeding, Streamlit launch, and evaluation commands.',
    code: README_MD,
  },
];

export const TEST_CASES_SPEC: TestCaseSpec[] = [
  {
    id: 'TC-01',
    title: 'Department Filter Query',
    category: 'Functional',
    input: 'Show all students in the Computer Science department.',
    expectedOutcome: 'Generates SELECT with JOIN departments WHERE department_name = "Computer Science"; returns 6 CS students.',
  },
  {
    id: 'TC-02',
    title: 'Subject Average Aggregation',
    category: 'Functional',
    input: 'Find the average marks obtained in each subject.',
    expectedOutcome: 'Generates GROUP BY subject_name with ROUND(AVG(marks_obtained), 2); returns 10 subject averages.',
  },
  {
    id: 'TC-03',
    title: 'Threshold Score Multi-Join',
    category: 'Functional',
    input: 'List students who scored more than 80 in DBMS.',
    expectedOutcome: 'Joins students, marks, and subjects; returns rows with marks_obtained > 80 sorted descending.',
  },
  {
    id: 'TC-04',
    title: 'LEFT JOIN Anti-Pattern',
    category: 'Functional',
    input: 'Find students who have not appeared for the DBMS exam.',
    expectedOutcome: 'Uses LEFT JOIN on marks filtered by DBMS subject_id with WHERE m.mark_id IS NULL.',
  },
  {
    id: 'TC-05',
    title: 'Destructive DROP Injection Blocked',
    category: 'Security',
    input: 'DROP TABLE students;',
    expectedOutcome: 'validate_sql() rejects query before DB execution and returns safe error without exposing file paths.',
  },
  {
    id: 'TC-06',
    title: 'Multi-Statement Smuggling Blocked',
    category: 'Security',
    input: 'SELECT * FROM students; DELETE FROM marks;',
    expectedOutcome: 'validate_sql() detects embedded semicolon and blocks multi-statement execution.',
  },
  {
    id: 'TC-07',
    title: 'PRAGMA / ATTACH Recon Blocked',
    category: 'Security',
    input: "ATTACH DATABASE 'other.db' AS x;",
    expectedOutcome: 'validate_sql() blocks ATTACH/PRAGMA keyword; SQLite URI ?mode=ro provides defense-in-depth.',
  },
  {
    id: 'TC-08',
    title: 'Empty or Ambiguous Input Handling',
    category: 'Edge Case',
    input: '   ',
    expectedOutcome: 'Input validation rejects empty prompt immediately with user-friendly guidance.',
  },
  {
    id: 'TC-09',
    title: 'Row Limit Cap Enforcement',
    category: 'Edge Case',
    input: 'SELECT * FROM marks LIMIT 9999;',
    expectedOutcome: 'Validator clamps LIMIT 9999 down to LIMIT 200 to prevent UI/memory exhaustion.',
  },
  {
    id: 'TC-10',
    title: 'Voice-to-SQL Two-Stage Pipeline',
    category: 'Functional',
    input: 'Spoken audio: "List students who scored more than 80 in DBMS."',
    expectedOutcome: 'speech_to_text.transcribe_audio() converts speech to English text first, displays transcript, then runs generate_sql() and execute_sql().',
  },
];

export const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    q: 'Why use few-shot prompting instead of zero-shot prompting for English-to-SQL?',
    a: 'Zero-shot models often guess table names, invent non-existent columns, or use MySQL/PostgreSQL syntax like ILIKE. Few-shot examples anchor the LLM to exact SQLite syntax, table aliases, proper JOINs, and rounding conventions.',
  },
  {
    q: 'How do you guarantee the database cannot be modified even if the LLM hallucinates or a user attempts SQL injection?',
    a: 'We apply defense-in-depth: Layer 1 (Prompt Rules) restricts output to one SELECT; Layer 2 (validate_sql) rejects comments, multiple semicolons, and 18 forbidden DDL/DML keywords while enforcing LIMIT 200; Layer 3 opens SQLite strictly in read-only mode (mode=ro / PRAGMA query_only=ON).',
  },
  {
    q: 'Why does evaluation.py use result-based comparison instead of exact SQL string matching?',
    a: 'Two different valid SQL queries can return identical answers (for example, different table aliases, column order, or INNER JOIN vs subquery). Comparing normalized executed result sets accurately measures functional correctness.',
  },
  {
    q: 'Why is a LEFT JOIN needed for counting students per department or finding students who missed an exam?',
    a: 'An INNER JOIN omits departments with zero students or students without matching mark rows. LEFT JOIN preserves all rows from the left table so missing matches appear as NULL and can be counted as 0 or filtered with IS NULL.',
  },
  {
    q: 'How does the project support running completely offline on a college laptop?',
    a: 'By defaulting to Ollama (llama3.2) running locally on port 11434, OpenAI Whisper for offline speech recognition, and an embedded SQLite file (student.db), no paid cloud database or external internet connection is required.',
  },
  {
    q: 'Why convert speech to English text before generating SQL instead of sending raw audio directly to the SQL LLM?',
    a: 'Separating transcription (Whisper) from SQL generation lets the user inspect and verify the recognized English question, keeps the SQL prompt deterministic and text-only, and works cleanly with local text LLMs like Ollama llama3.2.',
  },
];
