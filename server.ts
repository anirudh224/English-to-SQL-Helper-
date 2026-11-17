import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { EVALUATION_DATASET } from './src/lib/evalDataset.ts';
import { FEW_SHOT_EXAMPLES, PROMPT_RULES } from './src/lib/promptTemplate.ts';
import { SCHEMA_DDL, TABLES_META } from './src/lib/schemaData.ts';
import { compareQueryResults, validateSql } from './src/lib/sqlSafety.ts';
import { generateSqlWithGemini, transcribeAudioWithGemini } from './server/geminiSql.ts';
import {
  ensureStudentDatabase,
  executeReadOnlyQuery,
  getTableCounts,
  getTableRows,
} from './server/sqliteEngine.ts';

async function startServer() {
  await ensureStudentDatabase();

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
      database: 'student.db',
    });
  });

  app.get('/api/schema', async (_req: Request, res: Response) => {
    try {
      const counts = await getTableCounts();
      res.json({
        tables: TABLES_META.map((t) => ({
          ...t,
          rowCount: counts[t.name] ?? 0,
        })),
        ddl: SCHEMA_DDL,
        fewShotCount: FEW_SHOT_EXAMPLES.length,
        rulesCount: PROMPT_RULES.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load database schema.';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/table/:name', async (req: Request, res: Response) => {
    try {
      const tableName = String(req.params.name ?? '');
      const result = await getTableRows(tableName);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load table rows.';
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/transcribe', async (req: Request, res: Response) => {
    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/webm';

    if (!audioBase64.trim()) {
      return res.status(400).json({
        error: 'No audio recorded. Please record or upload an audio clip first.',
      });
    }

    try {
      const result = await transcribeAudioWithGemini(audioBase64, mimeType);
      return res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Speech transcription failed.';
      return res.status(502).json({ error: msg });
    }
  });

  app.post('/api/query', async (req: Request, res: Response) => {
    const mode = req.body?.mode === 'sql' ? 'sql' : 'nl';
    const question = typeof req.body?.question === 'string' ? req.body.question : '';
    const customSql = typeof req.body?.sql === 'string' ? req.body.sql : '';
    const model =
      typeof req.body?.model === 'string' && req.body.model.trim()
        ? req.body.model.trim()
        : 'gemini-4-hydrogen';

    if (mode === 'sql') {
      const validation = validateSql(customSql);
      if (!validation.valid) {
        return res.status(400).json({
          mode: 'sql',
          question: customSql,
          generatedSql: customSql,
          validation,
          error: validation.error,
          stage: 'validation_blocked',
        });
      }

      try {
        const execResult = await executeReadOnlyQuery(validation.sanitizedSql);
        return res.json({
          mode: 'sql',
          question: customSql,
          generatedSql: execResult.sanitizedSql,
          validation,
          ...execResult,
          stage: 'completed',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'SQL execution failed.';
        return res.status(400).json({
          mode: 'sql',
          question: customSql,
          generatedSql: validation.sanitizedSql,
          validation,
          error: msg,
          stage: 'execution_error',
        });
      }
    }

    // Natural Language -> Gemini Few-Shot -> Validate -> Read-Only SQLite
    if (!question.trim()) {
      return res.status(400).json({
        error: 'Please enter an English question.',
        stage: 'input_error',
      });
    }

    let generatedSql = '';
    let llmLatencyMs = 0;
    let usedModel = model;

    try {
      const gen = await generateSqlWithGemini(question, model);
      generatedSql = gen.sql;
      llmLatencyMs = gen.latencyMs;
      usedModel = gen.model;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'LLM generation failed.';
      return res.status(502).json({
        mode: 'nl',
        question,
        error: msg,
        stage: 'llm_error',
      });
    }

    const validation = validateSql(generatedSql);
    if (!validation.valid) {
      return res.status(400).json({
        mode: 'nl',
        question,
        generatedSql,
        llmLatencyMs,
        model: usedModel,
        validation,
        error: validation.error,
        stage: 'validation_blocked',
      });
    }

    try {
      const execResult = await executeReadOnlyQuery(validation.sanitizedSql);
      return res.json({
        mode: 'nl',
        question,
        generatedSql: execResult.sanitizedSql,
        llmLatencyMs,
        model: usedModel,
        validation,
        ...execResult,
        stage: 'completed',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'SQL execution failed.';
      return res.status(400).json({
        mode: 'nl',
        question,
        generatedSql: validation.sanitizedSql,
        llmLatencyMs,
        model: usedModel,
        validation,
        error: msg,
        stage: 'execution_error',
      });
    }
  });

  app.post('/api/evaluate/question', async (req: Request, res: Response) => {
    const questionId = Number(req.body?.questionId);
    const evalMode = req.body?.mode === 'baseline' ? 'baseline' : 'gemini';
    const item = EVALUATION_DATASET.find((q) => q.id === questionId);

    if (!item) {
      return res.status(404).json({ error: 'Evaluation question ID not found.' });
    }

    try {
      const expectedExec = await executeReadOnlyQuery(item.expectedSql);
      let candidateSql = item.expectedSql;

      if (evalMode === 'gemini') {
        const gen = await generateSqlWithGemini(item.english, 'gemini-4-hydrogen');
        candidateSql = gen.sql;
      }

      const validation = validateSql(candidateSql);
      if (!validation.valid) {
        return res.json({
          id: item.id,
          category: item.category,
          english: item.english,
          expectedSql: item.expectedSql,
          generatedSql: candidateSql,
          executionStatus: `Blocked: ${validation.error}`,
          resultMatch: false,
          correctness: 'Incorrect',
          reason: validation.error ?? 'Blocked by validator',
        });
      }

      try {
        const actualExec = await executeReadOnlyQuery(validation.sanitizedSql);
        const cmp = compareQueryResults(
          expectedExec.columns,
          expectedExec.rows,
          actualExec.columns,
          actualExec.rows,
          item.orderSensitive
        );
        return res.json({
          id: item.id,
          category: item.category,
          english: item.english,
          expectedSql: item.expectedSql,
          generatedSql: validation.sanitizedSql,
          executionStatus: 'Success',
          resultMatch: cmp.match,
          correctness: cmp.match ? 'Correct' : 'Incorrect',
          reason: cmp.reason,
          rowCount: actualExec.rowCount,
          executionMs: actualExec.executionMs,
        });
      } catch (execErr) {
        const msg = execErr instanceof Error ? execErr.message : 'Execution error';
        return res.json({
          id: item.id,
          category: item.category,
          english: item.english,
          expectedSql: item.expectedSql,
          generatedSql: validation.sanitizedSql,
          executionStatus: `Error: ${msg}`,
          resultMatch: false,
          correctness: 'Incorrect',
          reason: msg,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed';
      return res.status(502).json({
        id: item.id,
        category: item.category,
        english: item.english,
        expectedSql: item.expectedSql,
        generatedSql: '',
        executionStatus: `LLM Error: ${msg}`,
        resultMatch: false,
        correctness: 'Incorrect',
        reason: msg,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*path}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`English-to-SQL Helper server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
