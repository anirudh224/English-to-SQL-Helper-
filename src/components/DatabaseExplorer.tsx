import { useEffect, useState } from 'react';
import { Database, Search } from 'lucide-react';
import { TABLES_META, type TableMeta } from '../lib/schemaData';

interface SchemaApiResponse {
  tables: Array<TableMeta & { rowCount: number }>;
  ddl: string;
}

interface TableRowsResponse {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
}

export function DatabaseExplorer() {
  const [schemaInfo, setSchemaInfo] = useState<SchemaApiResponse | null>(null);
  const [activeTable, setActiveTable] = useState<TableMeta['name']>('students');
  const [tableData, setTableData] = useState<TableRowsResponse | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/schema')
      .then((r) => r.json())
      .then((data) => setSchemaInfo(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingTable(true);
    fetch(`/api/table/${activeTable}`)
      .then((r) => r.json())
      .then((data) => setTableData(data))
      .catch(() => setTableData(null))
      .finally(() => setLoadingTable(false));
  }, [activeTable]);

  const activeMeta =
    schemaInfo?.tables.find((t) => t.name === activeTable) ??
    TABLES_META.find((t) => t.name === activeTable)!;

  const filteredRows = (tableData?.rows ?? []).filter((row) => {
    if (!searchTerm.trim()) return true;
    const needle = searchTerm.toLowerCase();
    return row.some((cell) => String(cell ?? '').toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-6">
      {/* 5-Table Overview Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(schemaInfo?.tables ?? TABLES_META.map((t) => ({ ...t, rowCount: 0 }))).map((table) => {
          const isSelected = table.name === activeTable;
          return (
            <button
              key={table.name}
              type="button"
              onClick={() => {
                setActiveTable(table.name);
                setSearchTerm('');
              }}
              className={`text-left rounded-xl border p-4 transition-colors ${
                isSelected
                  ? 'border-teal-700 bg-teal-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-slate-900">{table.name}</span>
                <Database
                  className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-xl font-semibold font-mono tabular-nums text-slate-900">
                {table.rowCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {table.columns.length} columns
              </p>
            </button>
          );
        })}
      </section>

      {/* Schema Definition + Relationships */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Table Schema: <span className="font-mono">{activeMeta.name}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeMeta.description}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Column</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Constraints</th>
                  <th className="py-2 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeMeta.columns.map((col) => (
                  <tr key={col.name}>
                    <td className="py-2.5 pr-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {col.name}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-teal-800 whitespace-nowrap">{col.type}</td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600">{col.constraints}</td>
                    <td className="py-2.5 text-slate-600">{col.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Relational Star Topology</h3>
            <p className="text-xs text-slate-500 mb-4">
              All 5 tables connect via enforced foreign keys in <span className="font-mono">student.db</span>.
            </p>

            {/* Clean ER Diagram */}
            <svg viewBox="0 0 380 210" className="w-full h-auto border border-slate-100 rounded-lg bg-slate-50/70 p-2" role="img" aria-label="5-table entity relationship diagram">
              <line x1="190" y1="45" x2="70" y2="105" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="190" y1="45" x2="190" y2="105" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="190" y1="45" x2="310" y2="105" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="70" y1="135" x2="190" y2="175" stroke="#0f766e" strokeWidth="1.5" />
              <line x1="190" y1="135" x2="190" y2="175" stroke="#0f766e" strokeWidth="1.5" />
              <line x1="310" y1="135" x2="190" y2="175" stroke="#0f766e" strokeWidth="1.5" />

              {[
                { name: 'departments', x: 130, y: 12, w: 120 },
                { name: 'students', x: 18, y: 100, w: 104 },
                { name: 'subjects', x: 138, y: 100, w: 104 },
                { name: 'faculty', x: 258, y: 100, w: 104 },
                { name: 'marks', x: 130, y: 168, w: 120 },
              ].map((node) => {
                const isCurr = node.name === activeTable;
                return (
                  <g key={node.name}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.w}
                      height={32}
                      rx={6}
                      fill={isCurr ? '#0f766e' : '#ffffff'}
                      stroke={isCurr ? '#0f766e' : '#cbd5e1'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={node.x + node.w / 2}
                      y={node.y + 20}
                      textAnchor="middle"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      fill={isCurr ? '#ffffff' : '#0f172a'}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-800 mb-1.5">Foreign Key Links</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {activeMeta.relationships.map((rel) => (
                <li key={rel}>· {rel}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Live Table Data Browser */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Live Data Preview: <span className="font-mono">{activeTable}</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              · {filteredRows.length} rows
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Filter ${activeTable} rows...`}
              aria-label={`Filter ${activeTable} rows`}
              className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>

        {loadingTable ? (
          <div className="p-6 space-y-2">
            <div className="h-7 bg-slate-100 rounded animate-pulse" />
            <div className="h-7 bg-slate-100 rounded animate-pulse" />
            <div className="h-7 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : tableData && tableData.columns.length > 0 ? (
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  {tableData.columns.map((col) => (
                    <th key={col} className="px-4 py-2.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-4 py-2 text-slate-800 whitespace-nowrap ${
                          typeof cell === 'number' ? 'font-mono tabular-nums' : ''
                        }`}
                      >
                        {cell === null ? <span className="text-slate-400 font-mono">NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">No records found.</div>
        )}
      </section>
    </div>
  );
}
