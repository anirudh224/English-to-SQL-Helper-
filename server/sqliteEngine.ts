import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { SCHEMA_DDL, SEED_SQL, TABLES_META, type TableMeta } from '../src/lib/schemaData.ts';
import { validateSql } from '../src/lib/sqlSafety.ts';

const DB_FILE_PATH = path.resolve(process.cwd(), 'student.db');

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let initializedDbBytes: Uint8Array | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) =>
        path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
    });
  }
  return sqlJsPromise;
}

/**
 * Ensures student.db exists on disk with all 5 tables and realistic sample data.
 */
export async function ensureStudentDatabase(): Promise<Uint8Array> {
  if (initializedDbBytes) {
    return initializedDbBytes;
  }

  const SQL = await getSqlJs();
  const db: Database = new SQL.Database();
  try {
    db.run('PRAGMA foreign_keys = ON;');
    db.run(SCHEMA_DDL);
    db.run(SEED_SQL);
    const exported = db.export();
    fs.writeFileSync(DB_FILE_PATH, Buffer.from(exported));
    initializedDbBytes = exported;
    return exported;
  } finally {
    db.close();
  }
}

export interface QueryExecutionResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionMs: number;
  sanitizedSql: string;
  limitApplied: boolean;
}

/**
 * Opens student.db in strict read-only mode (PRAGMA query_only = ON)
 * after validating the SQL query with validateSql().
 */
export async function executeReadOnlyQuery(rawSql: string): Promise<QueryExecutionResult> {
  const validation = validateSql(rawSql);
  if (!validation.valid) {
    throw new Error(validation.error || 'Unsafe or invalid SQL query.');
  }

  const dbBytes = await ensureStudentDatabase();
  const SQL = await getSqlJs();
  const db = new SQL.Database(dbBytes);

  try {
    // Enforce SQLite engine-level read-only protection as defense-in-depth
    db.run('PRAGMA query_only = ON;');

    const startedAt = performance.now();
    const results = db.exec(validation.sanitizedSql);
    const executionMs = Number((performance.now() - startedAt).toFixed(2));

    if (!results.length) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionMs,
        sanitizedSql: validation.sanitizedSql,
        limitApplied: validation.limitApplied,
      };
    }

    const first = results[0];
    const cappedRows = first.values.slice(0, 200);
    return {
      columns: first.columns,
      rows: cappedRows,
      rowCount: cappedRows.length,
      executionMs,
      sanitizedSql: validation.sanitizedSql,
      limitApplied: validation.limitApplied,
    };
  } catch {
    // Never expose raw file paths or internal sqlite stack traces
    throw new Error('Query failed SQLite syntax or schema verification.');
  } finally {
    db.close();
  }
}

export async function getTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES_META) {
    const res = await executeReadOnlyQuery(`SELECT COUNT(*) AS cnt FROM ${table.name};`);
    counts[table.name] = Number(res.rows[0]?.[0] ?? 0);
  }
  return counts;
}

export async function getTableRows(tableName: string): Promise<QueryExecutionResult> {
  const allowed: Array<TableMeta['name']> = [
    'departments',
    'students',
    'subjects',
    'faculty',
    'marks',
  ];
  if (!allowed.includes(tableName as TableMeta['name'])) {
    throw new Error('Requested table does not exist in the 5-table student schema.');
  }
  return executeReadOnlyQuery(`SELECT * FROM ${tableName} LIMIT 200;`);
}
