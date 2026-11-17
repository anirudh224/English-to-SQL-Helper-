import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Code2,
  Database,
  PlaySquare,
} from 'lucide-react';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { EvaluationBench } from './components/EvaluationBench';
import { ProjectSubmissionKit } from './components/ProjectSubmissionKit';
import { PromptInspector } from './components/PromptInspector';
import { QueryWorkbench } from './components/QueryWorkbench';

type WorkspaceView = 'workbench' | 'schema' | 'eval' | 'prompt' | 'kit';

interface NavItem {
  id: WorkspaceView;
  label: string;
  breadcrumb: string;
  icon: typeof PlaySquare;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'workbench', label: 'Query Workbench', breadcrumb: 'Query Workbench', icon: PlaySquare },
  { id: 'schema', label: 'Database Schema', breadcrumb: 'Database Explorer', icon: Database },
  { id: 'eval', label: '40-Question Eval', breadcrumb: 'Accuracy Benchmark', icon: BarChart3 },
  { id: 'prompt', label: 'Prompt & Few-Shot', breadcrumb: 'Few-Shot Prompting', icon: Code2 },
  { id: 'kit', label: 'Python & Report', breadcrumb: 'Python & Project Report', icon: BookOpen },
];

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>('workbench');
  const currentNav = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (248px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 bg-white border-r border-slate-200">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            English-to-SQL Helper
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Workspace sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-800">Student Database Scope</p>
          <p>SQLite student.db · 5 tables</p>
          <p>Read-only SELECT · Max 200 rows</p>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200">
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900 lg:hidden whitespace-nowrap shrink-0">
                English-to-SQL Helper
              </span>
              <span className="hidden lg:inline text-slate-500 whitespace-nowrap">
                Student Database Studio
              </span>
              <span className="hidden lg:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <h1 className="hidden lg:block text-base font-semibold text-slate-900 truncate">
                {currentNav.breadcrumb}
              </h1>
            </div>

            <div className="hidden sm:block shrink-0">
              {activeView !== 'kit' ? (
                <button
                  type="button"
                  onClick={() => setActiveView('kit')}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Python & Report Kit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveView('workbench')}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Back to Query Workbench
                </button>
              )}
            </div>
          </div>

          {/* Mobile Compact Navigation Bar */}
          <nav
            className="lg:hidden px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto"
            aria-label="Mobile workspace navigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeView;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeView === 'workbench' && <QueryWorkbench />}
          {activeView === 'schema' && <DatabaseExplorer />}
          {activeView === 'eval' && <EvaluationBench />}
          {activeView === 'prompt' && <PromptInspector />}
          {activeView === 'kit' && <ProjectSubmissionKit />}
        </main>
      </div>
    </div>
  );
}
