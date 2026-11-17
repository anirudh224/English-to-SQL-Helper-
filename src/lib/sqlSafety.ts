export interface SqlValidationResult {
  valid: boolean;
  sanitizedSql: string;
  error?: string;
  blockedKeyword?: string;
  limitApplied: boolean;
}

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'CREATE',
  'ATTACH',
  'DETACH',
  'PRAGMA',
  'REPLACE',
  'TRUNCATE',
  'VACUUM',
  'REINDEX',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'LOAD_EXTENSION',
  'SAVEPOINT',
  'RELEASE',
  'ROLLBACK',
  'COMMIT',
  'BEGIN',
];

const MAX_ROWS = 200;

/**
 * Extracts raw SQL from an LLM response by stripping optional markdown fences
 * and leading "SQL:" labels.
 */
export function cleanGeneratedSql(rawText: string): string {
  let cleaned = (rawText ?? '').trim();

  // Strip ```sql ... ``` or ``` ... ``` fences
  const fenceMatch = cleaned.match(/```(?:sql|sqlite)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // Strip leading "SQL:" prefix if model echoed prompt label
  cleaned = cleaned.replace(/^sql\s*:\s*/i, '').trim();

  return cleaned;
}

/**
 * Strips single-quoted and double-quoted string literals so keyword checks
 * only inspect SQL syntax tokens rather than user data values.
 */
function stripStringLiterals(sql: string): string {
  return sql
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""');
}

/**
 * Validates that a SQL string is a single, safe, read-only SQLite SELECT/WITH query.
 */
export function validateSql(rawSql: string): SqlValidationResult {
  const cleaned = cleanGeneratedSql(rawSql);

  if (!cleaned) {
    return {
      valid: false,
      sanitizedSql: '',
      error: 'Query is empty. Please enter a question or a SELECT query.',
      limitApplied: false,
    };
  }

  if (cleaned.startsWith('-- Unable to generate a safe SQL query')) {
    return {
      valid: false,
      sanitizedSql: '',
      error: 'The question was ambiguous or outside the student database schema.',
      limitApplied: false,
    };
  }

  // Reject SQL comments that could hide injected statements
  const withoutStrings = stripStringLiterals(cleaned);
  if (/--|\/\*|\*\//.test(withoutStrings)) {
    return {
      valid: false,
      sanitizedSql: '',
      error: 'SQL comments (-- or /* */) are blocked by the safety validator.',
      limitApplied: false,
    };
  }

  // Strip at most one trailing semicolon, then reject any remaining semicolons
  const withoutTrailingSemi = cleaned.replace(/;\s*$/, '').trim();
  const withoutStringsNoTrailing = stripStringLiterals(withoutTrailingSemi);

  if (withoutStringsNoTrailing.includes(';')) {
    return {
      valid: false,
      sanitizedSql: '',
      error: 'Multiple SQL statements are not allowed. Only one SELECT query may run at a time.',
      limitApplied: false,
    };
  }

  // Must start with SELECT or WITH (CTE)
  if (!/^(SELECT|WITH)\b/i.test(withoutTrailingSemi)) {
    return {
      valid: false,
      sanitizedSql: '',
      error: 'Only read-only SELECT (or WITH ... SELECT) statements are permitted.',
      limitApplied: false,
    };
  }

  // Check for forbidden keywords outside string literals
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(withoutStringsNoTrailing)) {
      return {
        valid: false,
        sanitizedSql: '',
        error: `Blocked unsafe SQL operation: "${keyword}" is forbidden in read-only mode.`,
        blockedKeyword: keyword,
        limitApplied: false,
      };
    }
  }

  // Enforce a maximum row limit of 200
  let finalSql = withoutTrailingSemi;
  let limitApplied = false;
  const trailingLimitMatch = withoutStringsNoTrailing.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+\d+)?\s*$/i);

  if (trailingLimitMatch) {
    const requestedLimit = Number.parseInt(trailingLimitMatch[1], 10);
    if (requestedLimit > MAX_ROWS) {
      finalSql = finalSql.replace(/\bLIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$/i, (_m, offsetPart = '') => {
        return `LIMIT ${MAX_ROWS}${offsetPart}`;
      });
      limitApplied = true;
    }
  } else {
    finalSql = `${finalSql} LIMIT ${MAX_ROWS}`;
    limitApplied = true;
  }

  return {
    valid: true,
    sanitizedSql: `${finalSql};`,
    limitApplied,
  };
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return Number(value.toFixed(2)).toString();
  }
  const str = String(value).trim();
  const num = Number(str);
  if (str !== '' && !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(str)) {
    return Number.isInteger(num) ? String(num) : Number(num.toFixed(2)).toString();
  }
  return str.toLowerCase();
}

/**
 * Compares two SQLite result sets by their data values (result-based evaluation),
 * rather than brittle SQL string matching.
 */
export function compareQueryResults(
  expectedColumns: string[],
  expectedRows: unknown[][],
  actualColumns: string[],
  actualRows: unknown[][],
  orderSensitive: boolean
): { match: boolean; reason: string } {
  if (expectedRows.length !== actualRows.length) {
    return {
      match: false,
      reason: `Row count mismatch (expected ${expectedRows.length}, got ${actualRows.length})`,
    };
  }

  if (expectedColumns.length !== actualColumns.length) {
    return {
      match: false,
      reason: `Column count mismatch (expected ${expectedColumns.length}, got ${actualColumns.length})`,
    };
  }

  const normalizeRow = (row: unknown[]) => row.map(normalizeCell).join(' | ');
  const expNormalized = expectedRows.map(normalizeRow);
  const actNormalized = actualRows.map(normalizeRow);

  if (orderSensitive) {
    for (let i = 0; i < expNormalized.length; i++) {
      if (expNormalized[i] !== actNormalized[i]) {
        return {
          match: false,
          reason: `Row ${i + 1} mismatch: expected [${expNormalized[i]}], got [${actNormalized[i]}]`,
        };
      }
    }
    return { match: true, reason: 'Exact ordered result match' };
  }

  const expSorted = [...expNormalized].sort();
  const actSorted = [...actNormalized].sort();
  for (let i = 0; i < expSorted.length; i++) {
    if (expSorted[i] !== actSorted[i]) {
      return {
        match: false,
        reason: `Result set mismatch at sorted row ${i + 1}`,
      };
    }
  }

  return { match: true, reason: 'Result set matches expected output' };
}
