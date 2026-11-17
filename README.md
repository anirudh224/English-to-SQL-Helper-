# English-to-SQL Helper

Ask questions in English and run safe, read-only SQLite queries against a five-table student database. The React and Express app includes a query workbench, schema explorer, 40-question evaluation bench, prompt inspector, and a Python project/report kit.

The app generates its sample `student.db` from the schema and seed data at startup. Query execution is restricted to validated `SELECT` statements and capped at 200 rows.

## Run locally

**Prerequisite:** Node.js

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.
3. Start the app with `npm run dev`.

Run `npm run lint` for TypeScript checking and `npm run build` to create the production bundle.

View the app in AI Studio: https://ai.studio/apps/fbef66b7-b4fa-4ff3-bf58-7dbbecb047e7
