import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  Mic,
  Play,
  ShieldAlert,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';

interface QueryResponse {
  mode: 'nl' | 'sql' | 'voice';
  question: string;
  generatedSql?: string;
  llmLatencyMs?: number;
  model?: string;
  validation?: {
    valid: boolean;
    sanitizedSql: string;
    error?: string;
    blockedKeyword?: string;
    limitApplied: boolean;
  };
  columns?: string[];
  rows?: unknown[][];
  rowCount?: number;
  executionMs?: number;
  error?: string;
  stage?: string;
}

interface HistoryEntry {
  id: number;
  question: string;
  sql: string;
  status: 'success' | 'blocked' | 'error';
  rowCount: number;
}

const SAMPLE_NL_QUESTIONS = [
  'Show all students in Computer Science department.',
  'Find the average marks of each subject.',
  'List students who scored more than 80 in DBMS.',
  'Show the number of students in every department.',
  'Find students who have not appeared for the DBMS exam.',
  'Find the department with the highest average marks.',
];

const SECURITY_SQL_TESTS = [
  { label: 'Valid JOIN', sql: 'SELECT s.roll_number, s.full_name, d.department_name FROM students s JOIN departments d ON s.department_id = d.department_id ORDER BY s.roll_number;' },
  { label: 'Block DROP TABLE', sql: 'DROP TABLE students;' },
  { label: 'Block Multi-Statement', sql: 'SELECT * FROM students; DELETE FROM marks;' },
  { label: 'Block PRAGMA', sql: 'PRAGMA table_info(students);' },
];

const PIPELINE_STEPS = [
  { id: 1, title: 'English Question', detail: 'Typed or speech text' },
  { id: 2, title: 'Few-Shot Prompt', detail: 'Schema + 13 examples' },
  { id: 3, title: 'SQL Generated', detail: 'Single SELECT query' },
  { id: 4, title: 'Safety Validation', detail: 'Read-only & AST rules' },
  { id: 5, title: 'SQLite Execution', detail: 'PRAGMA query_only=ON' },
  { id: 6, title: 'Display Results', detail: 'Table + CSV export' },
];

function exportRowsToCsv(columns: string[], rows: unknown[][], filename: string) {
  const escapeCell = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    columns.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read audio file data.'));
        return;
      }
      const commaIdx = reader.result.indexOf(',');
      resolve(commaIdx >= 0 ? reader.result.slice(commaIdx + 1) : reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function QueryWorkbench() {
  const [mode, setMode] = useState<'nl' | 'voice' | 'sql'>('nl');
  const [question, setQuestion] = useState('Show all students in Computer Science department.');
  const [sqlInput, setSqlInput] = useState(SECURITY_SQL_TESTS[0].sql);
  const [loading, setLoading] = useState(false);
  const [voiceStage, setVoiceStage] = useState<'idle' | 'transcribing' | 'generating'>('idle');
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedSql, setCopiedSql] = useState(false);

  // Voice recording & transcription state
  const [whisperModel, setWhisperModel] = useState<'tiny' | 'base' | 'small'>('base');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLabel, setAudioLabel] = useState<string>('');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [transcribeLatencyMs, setTranscribeLatencyMs] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  function replaceAudioPreview(nextBlob: Blob | null, label: string) {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (nextBlob) {
      const nextUrl = URL.createObjectURL(nextBlob);
      setAudioBlob(nextBlob);
      setAudioUrl(nextUrl);
      setAudioLabel(label);
    } else {
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioLabel('');
    }
    setRecognizedText('');
    setTranscribeLatencyMs(null);
    setVoiceError(null);
  }

  async function startRecording() {
    setVoiceError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError(
        'Microphone recording is not supported in this browser context. Please upload an audio clip (.wav, .mp3, .webm) below.'
      );
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setVoiceError(
        'MediaRecorder is unavailable in this browser. Please upload an audio clip below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const recorded = new Blob(chunksRef.current, { type: mimeType });
        replaceAudioPreview(recorded, 'Microphone recording');
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setVoiceError(
        'Microphone access was denied or no microphone device was found. You can allow mic access or upload an audio clip below.'
      );
    }
  }

  function stopRecording() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  function handleAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|webm|ogg|m4a|flac)$/i.test(file.name)) {
      setVoiceError('Please select a valid audio file (.wav, .mp3, .webm, .ogg, or .m4a).');
      return;
    }
    replaceAudioPreview(file, file.name);
  }

  async function runQuery(overrideMode?: 'nl' | 'sql' | 'voice', overrideValue?: string) {
    const activeMode = overrideMode ?? mode;
    const isSqlMode = activeMode === 'sql';
    const payloadText = (overrideValue ?? (isSqlMode ? sqlInput : question)).trim();
    if (!payloadText) {
      setResult({
        mode: activeMode,
        question: '',
        error: isSqlMode ? 'Please enter a SQL query.' : 'Please enter an English question.',
        stage: 'input_error',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isSqlMode
            ? { mode: 'sql', sql: payloadText }
            : { mode: 'nl', question: payloadText }
        ),
      });
      const data: QueryResponse = await res.json();
      setResult({ ...data, mode: activeMode });

      const entryStatus: HistoryEntry['status'] = data.error
        ? data.stage === 'validation_blocked'
          ? 'blocked'
          : 'error'
        : 'success';

      setHistory((prev) => [
        {
          id: Date.now(),
          question: payloadText,
          sql: data.generatedSql || payloadText,
          status: entryStatus,
          rowCount: data.rowCount ?? 0,
        },
        ...prev.slice(0, 7),
      ]);
    } catch {
      setResult({
        mode: activeMode,
        question: payloadText,
        error: 'Unable to reach the query server. Please try again.',
        stage: 'network_error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConvertSpeechToSql() {
    setVoiceError(null);
    if (!audioBlob || audioBlob.size === 0) {
      setVoiceError('Please record or upload an audio clip first.');
      return;
    }

    setLoading(true);
    setVoiceStage('transcribing');
    setResult(null);

    let transcript = '';
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const mimeType = (audioBlob.type || 'audio/webm').split(';')[0];
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok || !transcribeData.text) {
        throw new Error(
          transcribeData.error || 'Speech could not be transcribed. Please speak clearly and try again.'
        );
      }

      transcript = String(transcribeData.text).trim();
      setRecognizedText(transcript);
      setTranscribeLatencyMs(
        typeof transcribeData.latencyMs === 'number' ? transcribeData.latencyMs : null
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Speech transcription failed.';
      setVoiceError(msg);
      setVoiceStage('idle');
      setLoading(false);
      return;
    }

    // Step 2: Send ONLY the transcribed English text to the existing English-to-SQL pipeline
    setVoiceStage('generating');
    try {
      const queryRes = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'nl', question: transcript }),
      });
      const data: QueryResponse = await queryRes.json();
      setResult({ ...data, mode: 'voice' });

      const entryStatus: HistoryEntry['status'] = data.error
        ? data.stage === 'validation_blocked'
          ? 'blocked'
          : 'error'
        : 'success';

      setHistory((prev) => [
        {
          id: Date.now(),
          question: `[Voice] ${transcript}`,
          sql: data.generatedSql || transcript,
          status: entryStatus,
          rowCount: data.rowCount ?? 0,
        },
        ...prev.slice(0, 7),
      ]);
    } catch {
      setResult({
        mode: 'voice',
        question: transcript,
        error: 'Unable to reach the SQL query server after transcription.',
        stage: 'network_error',
      });
    } finally {
      setVoiceStage('idle');
      setLoading(false);
    }
  }

  function handleCopySql() {
    if (!result?.generatedSql) return;
    navigator.clipboard.writeText(result.generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 1800);
  }

  function getStepStatus(stepId: number): 'idle' | 'active' | 'done' | 'blocked' {
    if (loading) {
      if (voiceStage === 'transcribing') {
        return stepId === 1 ? 'active' : 'idle';
      }
      return stepId <= 3 ? 'active' : 'idle';
    }
    if (!result) return 'idle';
    if (result.stage === 'completed') return 'done';
    if (result.stage === 'validation_blocked') {
      if (stepId < 4) return 'done';
      if (stepId === 4) return 'blocked';
      return 'idle';
    }
    if (result.stage === 'execution_error') {
      if (stepId < 5) return 'done';
      if (stepId === 5) return 'blocked';
      return 'idle';
    }
    if (result.stage === 'llm_error') {
      if (stepId === 1) return 'done';
      if (stepId <= 3) return 'blocked';
      return 'idle';
    }
    return 'idle';
  }

  return (
    <div className="space-y-6">
      {/* 6-Stage Execution Pipeline */}
      <section aria-label="Execution Pipeline" className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            How the Application Works
          </h2>
          <span className="text-xs text-slate-500">
            6-Stage Read-Only Pipeline · SQLite student.db
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STEPS.map((step, idx) => {
            const st = getStepStatus(step.id);
            const borderClass =
              st === 'done'
                ? 'border-teal-600/40 bg-teal-50/60'
                : st === 'blocked'
                  ? 'border-red-300 bg-red-50/70'
                  : st === 'active'
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-slate-200 bg-slate-50/70';

            const numClass =
              st === 'done'
                ? 'text-teal-700'
                : st === 'blocked'
                  ? 'text-red-700'
                  : 'text-slate-500';

            return (
              <div key={step.id} className={`relative rounded-lg border px-3 py-2.5 transition-colors ${borderClass}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-mono font-semibold tabular-nums ${numClass}`}>
                    0{step.id}
                  </span>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 hidden lg:block" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-900 truncate">{step.title}</p>
                <p className="text-[11px] text-slate-500 truncate">{step.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Query Composer */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Query Composer</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Type or speak a question in plain English, or test the SQL safety validator directly.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg" role="group" aria-label="Query input mode">
            <button
              type="button"
              onClick={() => setMode('nl')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'nl'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Type Question
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'voice'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" aria-hidden="true" />
              Speak Question
            </button>
            <button
              type="button"
              onClick={() => setMode('sql')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'sql'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SQL Safety Sandbox
            </button>
          </div>
        </div>

        {mode === 'nl' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runQuery('nl');
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="english-question-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                English Question
              </label>
              <textarea
                id="english-question-input"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., List students who scored more than 80 in DBMS."
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">Sample questions:</span>
                {SAMPLE_NL_QUESTIONS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setQuestion(sample)}
                    className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-md transition-colors text-left"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                {loading ? 'Generating & Running...' : 'Generate SQL'}
              </button>
            </div>
            {loading && (
              <p className="text-xs text-slate-500">
                Generating SQLite SELECT query with Gemini few-shot prompting and running read-only validation...
              </p>
            )}
          </form>
        )}

        {mode === 'voice' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900">Speak Your Question</h3>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="whisper-model-select" className="text-xs text-slate-600 whitespace-nowrap">
                  Whisper Model (Local Kit):
                </label>
                <select
                  id="whisper-model-select"
                  value={whisperModel}
                  onChange={(e) => setWhisperModel(e.target.value as 'tiny' | 'base' | 'small')}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-800 focus:border-teal-700 focus:outline-none"
                >
                  <option value="tiny">tiny</option>
                  <option value="base">base</option>
                  <option value="small">small</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                      Record Question
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Square className="w-3.5 h-3.5" aria-hidden="true" />
                      Stop Recording ({formatDuration(recordingSeconds)})
                    </button>
                  )}

                  <label
                    htmlFor="voice-audio-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    Upload Audio Clip
                  </label>
                  <input
                    id="voice-audio-upload"
                    type="file"
                    accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a"
                    onChange={handleAudioUpload}
                    className="sr-only"
                  />

                  {audioUrl && !isRecording && (
                    <button
                      type="button"
                      onClick={() => replaceAudioPreview(null, '')}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Clear Audio
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-slate-500">
                  Speech is transcribed to English text first, never sent directly to the SQL model.
                </span>
              </div>

              {audioUrl && (
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-800 truncate">{audioLabel}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500">
                      {audioBlob ? `${Math.max(1, Math.round(audioBlob.size / 1024))} KB` : ''}
                    </span>
                  </div>
                  <audio controls src={audioUrl} className="w-full h-9" />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Example prompt to speak: &ldquo;List students who scored more than 80 in DBMS.&rdquo;
                </p>

                <button
                  type="button"
                  onClick={handleConvertSpeechToSql}
                  disabled={loading || isRecording}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  {loading
                    ? voiceStage === 'transcribing'
                      ? 'Transcribing Speech...'
                      : 'Generating SQL...'
                    : 'Convert Speech to SQL'}
                </button>
              </div>
            </div>

            {voiceError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p>{voiceError}</p>
              </div>
            )}

            {recognizedText && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-teal-900">
                    Recognized English Question
                  </span>
                  <div className="flex items-center gap-3">
                    {transcribeLatencyMs !== null && (
                      <span className="text-[11px] font-mono tabular-nums text-teal-800">
                        Transcribed in {transcribeLatencyMs} ms
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setQuestion(recognizedText);
                        setMode('nl');
                      }}
                      className="text-xs font-medium text-teal-800 hover:text-teal-950 underline"
                    >
                      Edit in Type Mode
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-900 font-medium">{recognizedText}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'sql' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runQuery('sql');
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="raw-sql-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                SQL Query to Validate & Execute (Read-Only)
              </label>
              <textarea
                id="raw-sql-input"
                rows={3}
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                placeholder="SELECT * FROM students LIMIT 10;"
                className="w-full rounded-lg border border-slate-300 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">Test presets:</span>
                {SECURITY_SQL_TESTS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSqlInput(preset.sql);
                      runQuery('sql', preset.sql);
                    }}
                    className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Terminal className="w-4 h-4" aria-hidden="true" />
                {loading ? 'Validating...' : 'Validate & Run SQL'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Output Area: Error / Security Block / SQL + Data Table */}
      {result && (
        <section className="space-y-4" aria-live="polite">
          {result.generatedSql && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {result.validation?.valid ? (
                    <ShieldCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-600" aria-hidden="true" />
                  )}
                  <h3 className="text-sm font-semibold text-slate-900">
                    {result.mode === 'sql' ? 'Submitted SQL Query' : 'Generated SQL Query'}
                  </h3>
                  <span className="text-xs text-slate-500">
                    · {result.validation?.valid ? 'Validated SELECT (Read-Only)' : 'Blocked by Safety Validator'}
                    {result.llmLatencyMs ? ` · LLM ${result.llmLatencyMs} ms` : ''}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied' : 'Copy SQL'}
                </button>
              </div>

              <pre className="overflow-x-auto rounded-lg bg-slate-950 text-slate-100 p-4 text-xs font-mono leading-relaxed">
                <code>{result.generatedSql}</code>
              </pre>
            </div>
          )}

          {result.error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  {result.stage === 'validation_blocked' ? 'Query Blocked by Security Policy' : 'Query Error'}
                </p>
                <p className="text-xs text-red-800 mt-1">{result.error}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900 text-sm">Query Results</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{result.rowCount ?? 0} row(s)</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{result.executionMs ?? 0} ms</span>
                  {result.validation?.limitApplied && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700">Auto-capped at 200 rows</span>
                    </>
                  )}
                </div>

                {result.columns && result.rows && result.rows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportRowsToCsv(result.columns!, result.rows!, 'query_result.csv')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download CSV
                  </button>
                )}
              </div>

              {result.rows && result.rows.length > 0 && result.columns ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {result.columns.map((col) => (
                          <th
                            key={col}
                            scope="col"
                            className="px-4 py-2.5 font-mono font-semibold text-slate-700 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                          {row.map((cell, cellIdx) => {
                            const isNum = typeof cell === 'number';
                            return (
                              <td
                                key={cellIdx}
                                className={`px-4 py-2.5 text-slate-800 whitespace-nowrap ${
                                  isNum ? 'font-mono tabular-nums' : ''
                                }`}
                              >
                                {cell === null || cell === undefined ? (
                                  <span className="text-slate-400 font-mono">NULL</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  The query executed successfully in read-only mode and returned 0 matching rows.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Session Query History */}
      {history.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Queries in This Session</h3>
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{item.question}</p>
                  <p className="font-mono text-[11px] text-slate-500 truncate mt-0.5">{item.sql}</p>
                </div>
                <span
                  className={`font-mono tabular-nums shrink-0 ${
                    item.status === 'success'
                      ? 'text-teal-700'
                      : item.status === 'blocked'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  }`}
                >
                  {item.status === 'success'
                    ? `Success · ${item.rowCount} rows`
                    : item.status === 'blocked'
                      ? 'Blocked'
                      : 'Error'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
