# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Developer preference

The developer's preferred language is **Python**. When building scripts, tools, backends, or new standalone apps outside this web frontend, default to Python unless there is a strong reason not to.

This project's web frontend is TypeScript/Next.js (required for the browser environment), but any server-side logic, data processing scripts, or future backend additions should be written in Python.

> **Warning:** This project uses Next.js 16.2.6, which has breaking changes from earlier versions. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before making framework-level changes and heed deprecation notices.

## Commands

All commands must be run inside `kakeibo/` directory. On Windows (PowerShell), if `npm` / `npx` / `vercel` are not found in a fresh session, prepend:

```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

| Task | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:3000 |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Deploy to Vercel | `vercel` (requires Vercel CLI: `npm i -g vercel`) |

No test suite is configured.

## Architecture

### Data flow

All state lives in the browser's **localStorage** under the key `kakeibo_transactions`. There is no backend, no auth, and no network requests.

```
localStorage
    ↕ (load/save)
app/lib/storage.ts   ← CRUD helpers (loadTransactions, addTransaction, deleteTransaction)
    ↕
app/page.tsx         ← single page; holds useState for transactions + currentMonth
    ↓ props
  components/*       ← pure display components, receive transactions[] as props
```

### Month filtering

`page.tsx` filters the full transaction list by `currentMonth` (format `YYYY-MM`) on every render. No per-month storage; all months coexist in one flat array sorted by date descending in `TransactionList`.

### Key files

- **`app/types.ts`** — `Transaction` interface + `EXPENSE_CATEGORIES` / `INCOME_CATEGORIES` constant arrays. Add new categories here.
- **`app/lib/storage.ts`** — all localStorage reads/writes. If storage backend changes (e.g., to a DB), only this file needs to change.
- **`app/page.tsx`** — `'use client'` root; owns `transactions` state and passes `monthTransactions` (filtered slice) down to all components. Also owns `showForm` modal flag.
- **`app/components/TransactionForm.tsx`** — controlled modal form; calls `onAdd(tx)` on submit, `onClose()` on cancel/submit. Category list switches based on selected type.
- **`app/components/Calendar.tsx`** — aggregates daily income/expense from `transactions[]`; abbreviates large numbers (`abbr()` helper: `万` / `k`).
- **`app/components/ExpensePieChart.tsx`** — Recharts `PieChart` fed by grouping expense transactions by category. Returns early with placeholder if no expense data.

### Styling

Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.*` file needed). All classes are utility-first inline; no separate CSS modules.

### Deployment

Vercel (no GitHub required). Run `vercel` in `kakeibo/` and follow prompts. Data remains in the user's browser localStorage regardless of hosting.
