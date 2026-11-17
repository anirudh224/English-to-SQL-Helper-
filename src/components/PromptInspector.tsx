import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  buildEnglishToSqlPrompt,
  FEW_SHOT_EXAMPLES,
  PROMPT_RULES,
} from '../lib/promptTemplate';

export function PromptInspector() {
  const [previewQuestion, setPreviewQuestion] = useState(
    'List students who scored more than 80 in DBMS.'
  );
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const assembledPrompt = buildEnglishToSqlPrompt(previewQuestion);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(assembledPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Rules + Prompt Anatomy */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Strict SQLite & Safety Prompt Rules
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Every LLM call enforces these 11 constraints inside the <span className="font-mono">&lt;rules&gt;</span> block.
          </p>
          <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside">
            {PROMPT_RULES.map((rule) => (
              <li key={rule} className="leading-relaxed">
                {rule}
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Live Assembled Prompt Preview
              </h3>
              <p className="text-xs text-slate-500">
                Includes full 5-table DDL, column semantics, rules, and all {FEW_SHOT_EXAMPLES.length} few-shot examples.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPrompt ? 'Copied Prompt' : 'Copy Full Prompt'}
            </button>
          </div>

          <div className="mb-3">
            <label htmlFor="prompt-preview-q" className="block text-xs font-medium text-slate-600 mb-1">
              Test Placeholder Question ({'{{USER_QUESTION}}'})
            </label>
            <input
              id="prompt-preview-q"
              type="text"
              value={previewQuestion}
              onChange={(e) => setPreviewQuestion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <pre className="flex-1 max-h-80 overflow-auto rounded-lg bg-slate-950 text-slate-100 p-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
            <code>{assembledPrompt}</code>
          </pre>
        </div>
      </section>

      {/* Few-Shot Examples Grid */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Few-Shot Prompt Examples ({FEW_SHOT_EXAMPLES.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Anchored pairs covering JOINs, aggregations, LEFT JOIN anti-patterns, and NULL-safe filtering.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEW_SHOT_EXAMPLES.map((ex) => (
            <div key={ex.id} className="rounded-lg border border-slate-200 p-4 bg-slate-50/40">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                <span className="font-mono font-semibold text-teal-800">
                  Example {String(ex.id).padStart(2, '0')}
                </span>
                <span>{ex.category}</span>
              </div>
              <p className="text-sm font-medium text-slate-900 mb-2.5">{ex.english}</p>
              <pre className="rounded-md bg-slate-950 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
                <code>{ex.sql}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
