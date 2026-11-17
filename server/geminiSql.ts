import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { buildEnglishToSqlPrompt } from '../src/lib/promptTemplate.ts';
import { cleanGeneratedSql } from '../src/lib/sqlSafety.ts';

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your key in Settings > Secrets to run live LLM generation.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export interface SqlGenerationResult {
  sql: string;
  prompt: string;
  model: string;
  latencyMs: number;
}

export async function generateSqlWithGemini(
  question: string,
  model = 'gemini-4-hydrogen'
): Promise<SqlGenerationResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error('Please enter an English question before generating SQL.');
  }

  const prompt = buildEnglishToSqlPrompt(trimmed);
  const ai = getGeminiClient();

  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = performance.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a strict SQLite SQL generator. Output only a single valid SQLite SELECT statement without markdown fences or commentary.',
        },
      });

      const rawText = response.text ?? '';
      const cleanedSql = cleanGeneratedSql(rawText);
      const latencyMs = Number((performance.now() - started).toFixed(1));

      return {
        sql: cleanedSql,
        prompt,
        model,
        latencyMs,
      };
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
        throw new Error(
          'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.'
        );
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }

  const fallbackMsg = lastError instanceof Error ? lastError.message : 'Gemini request failed.';
  throw new Error(fallbackMsg);
}

export interface AudioTranscriptionResult {
  text: string;
  model: string;
  latencyMs: number;
}

export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string
): Promise<AudioTranscriptionResult> {
  const cleanedBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleanedBase64) {
    throw new Error('No audio data was received. Please record or upload an audio clip.');
  }

  const ai = getGeminiClient();
  const started = performance.now();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanedBase64,
            },
          },
          {
            text: 'Transcribe the spoken English database question accurately as plain text only. Do not generate SQL or add explanations.',
          },
        ],
      },
    });

    const recognizedText = (response.text ?? '').trim();
    if (!recognizedText) {
      throw new Error('Speech could not be understood. Please speak clearly and try again.');
    }

    return {
      text: recognizedText,
      model: 'gemini-3.5-transcribe',
      latencyMs: Number((performance.now() - started).toFixed(1)),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      throw new Error(
        'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.'
      );
    }
    throw new Error(msg || 'Speech recognition failed. Please try recording again.');
  }
}
