import { useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import {
  PYTHON_PROJECT_FILES,
  TEST_CASES_SPEC,
  VIVA_QUESTIONS,
} from '../lib/pythonProjectBundle';

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProjectSubmissionKit() {
  const [subTab, setSubTab] = useState<'code' | 'report'>('code');
  const [activeFile, setActiveFile] = useState(PYTHON_PROJECT_FILES[0].filename);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const selectedFile =
    PYTHON_PROJECT_FILES.find((f) => f.filename === activeFile) ?? PYTHON_PROJECT_FILES[0];

  function handleCopy(filename: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation between Python/Streamlit Code and Academic Report */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Submission-Ready Python & Streamlit Project Kit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete runnable local Python source code (Ollama + Free API + SQLite + Streamlit) and academic report deliverables.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg" role="group" aria-label="Project kit view">
          <button
            type="button"
            onClick={() => setSubTab('code')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'code'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Python Source Files ({PYTHON_PROJECT_FILES.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('report')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'report'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Report, Test Cases & Viva
          </button>
        </div>
      </div>

      {subTab === 'code' ? (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* File Tree */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-3 space-y-1">
            {PYTHON_PROJECT_FILES.map((file) => {
              const isSelected = file.filename === selectedFile.filename;
              return (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => setActiveFile(file.filename)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
                    isSelected ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileCode2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold truncate">{file.filename}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{file.summary}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-mono font-semibold text-slate-900">
                  {selectedFile.filename}
                </h3>
                <p className="text-xs text-slate-500">{selectedFile.summary}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedFile.filename, selectedFile.code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiedFile === selectedFile.filename ? (
                    <Check className="w-3.5 h-3.5 text-teal-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedFile === selectedFile.filename ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadTextFile(selectedFile.filename, selectedFile.code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-100 text-xs font-mono overflow-auto max-h-[560px] leading-relaxed">
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Problem Statement & Objectives */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                01. Problem Statement
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Non-technical academic staff, students, and coordinators often struggle to extract insights
                from relational student databases because writing accurate multi-table SQL queries requires
                knowledge of schemas, foreign keys, and aggregation syntax. At the same time, connecting an
                LLM directly to a database without strict validation introduces risks of schema hallucination
                and destructive SQL injection. This project solves both problems by pairing few-shot LLM
                prompting with deterministic SQL validation and a strict read-only SQLite execution sandbox.
              </p>

              <h3 className="text-sm font-semibold text-slate-900 mt-5 mb-2">
                02. Core Objectives
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>· Design a normalized 5-table SQLite student database with realistic Indian academic records.</li>
                <li>· Guide local (Ollama) and cloud (Gemini/Groq) LLMs using 13 curated few-shot examples.</li>
                <li>· Enforce multi-layered read-only SQL safety validation blocking all DDL/DML and multi-statements.</li>
                <li>· Measure empirical query correctness across 40 diverse English questions using result-set matching.</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                03. Software & Hardware Requirements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Software Stack</p>
                  <ul className="space-y-1">
                    <li>· Python 3.10+ & SQLite 3</li>
                    <li>· Streamlit, Pandas, Requests</li>
                    <li>· OpenAI Whisper + FFmpeg (Voice)</li>
                    <li>· Ollama (llama3.2) or Gemini API</li>
                    <li>· OS: Windows 10/11, macOS, or Linux</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Laptop Hardware</p>
                  <ul className="space-y-1">
                    <li>· CPU: Quad-core Intel i5 / Ryzen 5</li>
                    <li>· RAM: 8 GB min (16 GB for local 3B LLM)</li>
                    <li>· Storage: 4 GB free disk space</li>
                    <li>· GPU: Optional (CPU runs llama3.2 smoothly)</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 mt-5 mb-2">
                04. Local Installation Commands
              </h3>
              <pre className="rounded-lg bg-slate-950 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
                <code>{`pip install -r requirements.txt
ollama pull llama3.2
python database.py
streamlit run app.py
python evaluation.py`}</code>
              </pre>
            </div>
          </section>

          {/* Formal Test Cases */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                05. Formal Test Cases & Security Verification Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="px-4 py-2.5 font-medium">ID</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Test Case</th>
                    <th className="px-4 py-2.5 font-medium">Input</th>
                    <th className="px-4 py-2.5 font-medium">Expected Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TEST_CASES_SPEC.map((tc) => (
                    <tr key={tc.id}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {tc.id}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{tc.category}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">{tc.title}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{tc.input}</td>
                      <td className="px-4 py-2.5 text-slate-600">{tc.expectedOutcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Viva Questions & Answers */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              06. Viva Examination Questions & Answers
            </h3>
            <div className="divide-y divide-slate-100">
              {VIVA_QUESTIONS.map((item, idx) => (
                <div key={item.q} className="py-3.5 first:pt-0 last:pb-0">
                  <p className="text-xs font-semibold text-slate-900">
                    Q{idx + 1}. {item.q}
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
