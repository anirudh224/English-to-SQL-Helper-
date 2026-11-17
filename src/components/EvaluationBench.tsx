import { Fragment, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Play,
  Square,
  XCircle,
} from 'lucide-react';
import { EVALUATION_DATASET } from '../lib/evalDataset';

interface EvalRowResult {
  id: number;
  category: string;
  english: string;
  expectedSql: string;
  generatedSql: string;
  executionStatus: string;
  resultMatch: boolean;
  correctness: 'Correct' | 'Incorrect';
  reason: string;
  rowCount?: number;
  executionMs?: number;
}

function downloadEvaluationCsv(rows: EvalRowResult[]) {
  const escapeCell = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const header = [
    'Question ID',
    'English question',
    'expected SQL',
    'generated SQL',
    'execution status',
    'result match',
    'correctness',
  ];
  const lines = [
    header.map(escapeCell).join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.english,
        r.expectedSql,
        r.generatedSql,
        r.executionStatus,
        r.resultMatch,
        r.correctness,
      ]
        .map(escapeCell)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'evaluation_report.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function EvaluationBench() {
  const [results, setResults] = useState<Record<number, EvalRowResult>>({});
  const [running, setRunning] = useState(false);
  const [runMode, setRunMode] = useState<'gemini' | 'baseline'>('gemini');
  const [progressCount, setProgressCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Correct' | 'Incorrect'>('All');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const cancelRef = useRef(false);

  const categories = ['All', ...Array.from(new Set(EVALUATION_DATASET.map((q) => q.category)))];

  async function runBenchmark(mode: 'gemini' | 'baseline', limitCount = EVALUATION_DATASET.length) {
    cancelRef.current = false;
    setRunMode(mode);
    setRunning(true);
    setProgressCount(0);
    setResults({});

    const subset = EVALUATION_DATASET.slice(0, limitCount);
    const batchSize = mode === 'gemini' ? 2 : 8;

    for (let i = 0; i < subset.length; i += batchSize) {
      if (cancelRef.current) break;
      const batch = subset.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const res = await fetch('/api/evaluate/question', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId: item.id, mode }),
            });
            const data: EvalRowResult = await res.json();
            return data;
          } catch {
            return {
              id: item.id,
              category: item.category,
              english: item.english,
              expectedSql: item.expectedSql,
              generatedSql: '',
              executionStatus: 'Network Error',
              resultMatch: false,
              correctness: 'Incorrect' as const,
              reason: 'Request failed',
            };
          }
        })
      );

      setResults((prev) => {
        const next = { ...prev };
        for (const r of batchResults) {
          next[r.id] = r;
        }
        return next;
      });
      setProgressCount((prev) => Math.min(subset.length, prev + batch.length));
    }

    setRunning(false);
  }

  const evaluatedList = Object.values(results).sort((a, b) => a.id - b.id);
  const totalEvaluated = evaluatedList.length;
  const correctCount = evaluatedList.filter((r) => r.correctness === 'Correct').length;
  const incorrectCount = totalEvaluated - correctCount;
  const accuracyPct =
    totalEvaluated > 0 ? ((correctCount / totalEvaluated) * 100).toFixed(1) : '0.0';

  const visibleRows = EVALUATION_DATASET.filter((q) => {
    if (categoryFilter !== 'All' && q.category !== categoryFilter) return false;
    const res = results[q.id];
    if (statusFilter === 'Correct' && res?.correctness !== 'Correct') return false;
    if (statusFilter === 'Incorrect' && res?.correctness !== 'Incorrect') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control & Accuracy Metrics Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              40-Question Accuracy Evaluation Benchmark
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Evaluates generated SQL using result-based comparison against read-only SQLite execution:
              <span className="font-mono text-slate-700 ml-1">
                Accuracy = (Correct queries / Total questions) × 100
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {running ? (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5" aria-hidden="true" />
                Stop Evaluation ({progressCount}/40)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => runBenchmark('baseline', 40)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Verify 40 Expected SQLs
                </button>
                <button
                  type="button"
                  onClick={() => runBenchmark('gemini', 40)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  Run Accuracy Test on 40 Questions
                </button>
              </>
            )}

            {evaluatedList.length > 0 && (
              <button
                type="button"
                onClick={() => downloadEvaluationCsv(evaluatedList)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Download CSV Report
              </button>
            )}
          </div>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Accuracy</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
              {accuracyPct}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Evaluated</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
              {totalEvaluated} / {EVALUATION_DATASET.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Correct Queries</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-teal-700 mt-0.5">
              {correctCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Incorrect Queries</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-red-700 mt-0.5">
              {incorrectCount}
            </p>
          </div>
        </div>

        {running && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>
                Running {runMode === 'gemini' ? 'Live Gemini Few-Shot' : 'Ground-Truth SQLite'} evaluation...
              </span>
              <span className="font-mono tabular-nums">{progressCount} / 40</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700 transition-all duration-200"
                style={{ width: `${(progressCount / 40) * 100}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Filter Toolbar + 40-Question Results Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="eval-category-select" className="text-xs font-medium text-slate-600">
              SQL Construct:
            </label>
            <select
              id="eval-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter correctness">
            {(['All', 'Correct', 'Incorrect'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-4 py-2.5 font-medium w-12">ID</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">English Question</th>
                <th className="px-4 py-2.5 font-medium">Execution Status</th>
                <th className="px-4 py-2.5 font-medium">Result Match</th>
                <th className="px-4 py-2.5 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((item) => {
                const res = results[item.id];
                const isExpanded = expandedId === item.id;
                return (
                  <>
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                        #{String(item.id).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.category}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{item.english}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {res ? res.executionStatus : 'Pending'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!res ? (
                          <span className="text-slate-400">—</span>
                        ) : res.correctness === 'Correct' ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            Incorrect
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          aria-expanded={isExpanded}
                          aria-label={`Inspect SQL for question ${item.id}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          SQL
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-detail`} className="bg-slate-50/80">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
                                Expected Ground-Truth SQL
                              </p>
                              <pre className="rounded-lg bg-slate-950 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto">
                                <code>{item.expectedSql}</code>
                              </pre>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
                                {res ? 'Generated / Evaluated SQL' : 'Not evaluated yet'}
                              </p>
                              <pre className="rounded-lg bg-slate-950 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto">
                                <code>
                                  {res?.generatedSql || '-- Click "Run Accuracy Test on 40 Questions" above.'}
                                </code>
                              </pre>
                              {res?.reason && (
                                <p className="text-[11px] text-slate-600 mt-1.5">
                                  Comparison note: {res.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
