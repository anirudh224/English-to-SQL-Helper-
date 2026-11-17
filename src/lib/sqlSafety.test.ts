import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSql, cleanGeneratedSql, compareQueryResults } from './sqlSafety';
import { EVALUATION_DATASET } from './evalDataset';
import { FEW_SHOT_EXAMPLES, buildEnglishToSqlPrompt } from './promptTemplate';
import { PYTHON_PROJECT_FILES } from './pythonProjectBundle';
import { executeReadOnlyQuery, getTableCounts } from '../../server/sqliteEngine';

test('validateSql permits valid SELECT and WITH queries and enforces LIMIT 200', () => {
  const res = validateSql('SELECT full_name FROM students ORDER BY full_name;');
  assert.equal(res.valid, true);
  assert.equal(res.limitApplied, true);
  assert.match(res.sanitizedSql, /LIMIT 200;$/);

  const cte = validateSql(
    'WITH top_cs AS (SELECT * FROM students WHERE department_id = 1) SELECT * FROM top_cs LIMIT 10;'
  );
  assert.equal(cte.valid, true);
  assert.equal(cte.limitApplied, false);
  assert.equal(cte.sanitizedSql, 'WITH top_cs AS (SELECT * FROM students WHERE department_id = 1) SELECT * FROM top_cs LIMIT 10;');
});

test('validateSql clamps oversized LIMIT values down to 200', () => {
  const res = validateSql('SELECT * FROM marks LIMIT 9999;');
  assert.equal(res.valid, true);
  assert.equal(res.limitApplied, true);
  assert.match(res.sanitizedSql, /LIMIT 200;$/);
});

test('validateSql blocks all dangerous SQL operations and multi-statements', () => {
  const dangerous = [
    'INSERT INTO departments (department_name, hod_name) VALUES ("AI", "Dr. X");',
    'UPDATE students SET admission_year = 2025;',
    'DELETE FROM marks;',
    'DROP TABLE students;',
    'ALTER TABLE students ADD COLUMN age INTEGER;',
    'CREATE TABLE hacked (id INTEGER);',
    "ATTACH DATABASE 'other.db' AS aux;",
    'PRAGMA table_info(students);',
    'SELECT * FROM students; DROP TABLE marks;',
    'SELECT * FROM students -- malicious comment',
    'SELECT /* comment */ * FROM students',
    '',
    '-- Unable to generate a safe SQL query.',
  ];

  for (const sql of dangerous) {
    const res = validateSql(sql);
    assert.equal(res.valid, false, `Expected validator to block: ${sql}`);
  }
});

test('validateSql does not falsely block forbidden keywords inside string literals', () => {
  const res = validateSql("SELECT * FROM subjects WHERE subject_name = 'Database Update & Delete';");
  assert.equal(res.valid, true);
});

test('cleanGeneratedSql strips markdown code fences and SQL prefixes', () => {
  const raw = '```sql\nSQL:\nSELECT COUNT(*) FROM students;\n```';
  assert.equal(cleanGeneratedSql(raw), 'SELECT COUNT(*) FROM students;');
});

test('compareQueryResults handles numeric precision and unordered sets', () => {
  const sameUnordered = compareQueryResults(
    ['name', 'avg'],
    [
      ['Aarav', 88.5],
      ['Ananya', 91.0],
    ],
    ['student_name', 'average_marks'],
    [
      ['Ananya', 91],
      ['Aarav', 88.5],
    ],
    false
  );
  assert.equal(sameUnordered.match, true);

  const mismatchCount = compareQueryResults(['id'], [[1]], ['id'], [[1], [2]], false);
  assert.equal(mismatchCount.match, false);
});

test('prompt template includes schema, rules, and at least 10 few-shot examples', () => {
  assert.ok(FEW_SHOT_EXAMPLES.length >= 10);
  const prompt = buildEnglishToSqlPrompt('Show all students in Computer Science.');
  assert.match(prompt, /<schema>/);
  assert.match(prompt, /<rules>/);
  assert.match(prompt, /<examples>/);
  assert.match(prompt, /Show all students in Computer Science\./);
});

test('student.db initializes with required minimum row counts and executes all 40 evaluation SQLs cleanly', async () => {
  assert.equal(EVALUATION_DATASET.length, 40);

  const counts = await getTableCounts();
  assert.ok(counts.departments >= 5);
  assert.ok(counts.students >= 20);
  assert.ok(counts.subjects >= 8);
  assert.ok(counts.faculty >= 10);
  assert.ok(counts.marks >= 60);

  for (const q of EVALUATION_DATASET) {
    const val = validateSql(q.expectedSql);
    assert.equal(val.valid, true, `Question ${q.id} failed validation: ${val.error}`);
    const exec = await executeReadOnlyQuery(val.sanitizedSql);
    assert.ok(exec.columns.length > 0, `Question ${q.id} returned no columns`);
    assert.ok(exec.rowCount > 0, `Question ${q.id} returned 0 rows`);
  }
});

test('read-only SQLite engine rejects write attempts even if invoked directly', async () => {
  await assert.rejects(() => executeReadOnlyQuery('DELETE FROM marks;'));
});

test('python project bundle includes modular Whisper voice-to-SQL files and exports', () => {
  const byName = new Map(PYTHON_PROJECT_FILES.map((f) => [f.filename, f.code]));
  const stt = byName.get('speech_to_text.py');
  assert.ok(stt, 'speech_to_text.py missing from PYTHON_PROJECT_FILES');
  assert.match(stt, /def transcribe_audio\(audio_file.*model_name.*=.*"base"\)/);
  assert.match(stt, /@st\.cache_resource/);
  assert.match(stt, /finally:/);

  const executor = byName.get('sql_executor.py') ?? '';
  assert.match(executor, /execute_sql = execute_safe_query/);

  const appPy = byName.get('app.py') ?? '';
  assert.match(appPy, /"Speak Question"/);
  assert.match(appPy, /st\.audio_input/);
  assert.match(appPy, /Convert Speech to SQL/);
  assert.match(appPy, /transcribe_audio/);
  assert.match(appPy, /execute_sql/);

  const reqs = byName.get('requirements.txt') ?? '';
  assert.match(reqs, /openai-whisper/);

  const readme = byName.get('README.md') ?? '';
  assert.match(readme, /## Voice Input Feature/);
  assert.match(readme, /ffmpeg/i);
});
