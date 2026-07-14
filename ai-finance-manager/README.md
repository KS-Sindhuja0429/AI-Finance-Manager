# Pulse — AI Personal Finance Manager

A full-stack personal finance manager with authentication, transaction tracking,
budgets, savings goals, reports, forecasting, and a Gemini-powered AI financial
assistant.

## Tech stack

**Frontend:** React (Vite), Tailwind CSS, React Router DOM, Axios, React Hook Form,
Chart.js, Framer Motion, React Icons

**Backend:** Python Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS,
Flask-Bcrypt, SQLite (swap to Postgres by changing one env var)

**AI:** Google Gemini API (`google-generativeai`)

## Project structure

```
ai-finance-manager/
├── backend/
│   ├── app.py                 # Flask app factory & entry point
│   ├── config.py
│   ├── extensions.py
│   ├── models.py               # SQLAlchemy models
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py
│       ├── transactions.py
│       ├── categories.py
│       ├── accounts.py
│       ├── budgets.py
│       ├── goals.py
│       ├── reports.py
│       ├── forecast.py
│       ├── ai_assistant.py
│       ├── settings.py
│       └── dashboard.py
└── frontend/
    ├── src/
    │   ├── pages/               # Dashboard, Transactions, Budgets, Goals, ...
    │   ├── components/          # Sidebar, Navbar, Modal, StatCard, ...
    │   ├── context/AuthContext.jsx
    │   ├── api/axios.js
    │   └── utils/format.js
    ├── package.json
    └── .env.example
```

## Getting started

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env             # then edit .env — see below
python app.py
```

The API runs at `http://localhost:5000`. Tables are created automatically on
first run (SQLite file `backend/finance.db`).

**Backend `.env` values:**

| Variable | Notes |
|---|---|
| `SECRET_KEY`, `JWT_SECRET_KEY` | Replace with random strings before deploying |
| `DATABASE_URL` | Defaults to SQLite; set a Postgres URL to switch databases |
| `FRONTEND_ORIGIN` | Must match the URL the frontend is served from (CORS) |
| `GEMINI_API_KEY` | Get one at https://aistudio.google.com/app/apikey — without it, the AI Assistant still works but replies with a data-only summary instead of a live model response |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` (current, supported). **Do not use `gemini-1.5-*` or `gemini-2.0-*` — Google has shut those down and they return 404.** `gemini-flash-latest` also works and always tracks Google's newest Flash model. |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # points at http://localhost:5000/api by default
npm run dev
```

The app runs at `http://localhost:5173`. Register a new account to get started —
a default set of categories (Food, Travel, Shopping, Bills, Entertainment,
Education, Salary, Investment, Healthcare, Others) is created automatically.

### 3. Production build

```bash
cd frontend
npm run build       # outputs static files to frontend/dist
```

Serve `frontend/dist` with any static host (Netlify, Vercel, nginx, etc.) and
run the Flask backend behind a production WSGI server (gunicorn/uWSGI) with
`FLASK_ENV=production` and a real `DATABASE_URL`.

## Feature checklist

- JWT authentication (register / login / logout / protected routes)
- Animated dashboard: income, expenses, net savings, monthly cash flow,
  financial health score, expense pie chart, income-vs-expense bar chart,
  monthly trend line, recent transactions, budget progress, savings goals
- Transactions: full CRUD with search, type/category filters, sorting, and
  pagination; account balances update automatically
- Categories: CRUD with income/expense type and color tagging
- Accounts: cash, bank, credit card, wallet — with live balance tracking
- Budgets: monthly limits per category, overspend alerts, progress bars, and
  data-driven budget recommendations based on historical average spend
- Goals: target amount, deadline, contributions, progress percentage
- Reports: weekly / monthly / yearly summaries with expense & income
  breakdowns, CSV export, and PDF export
- Forecasting: two forecasting engines —
  1. **Statistical** (`/api/forecast`): next-month income/expense/savings via a
     weighted moving average, plus projected cumulative cash flow
  2. **Neural network** (`/api/ml/expense-forecast`): a genuine LSTM
     (Long Short-Term Memory) model, built with **TensorFlow/Keras**, trained
     on-demand on each user's own daily expense history to predict day-by-day
     spending for the next 1–90 days. Falls back to a clear "not enough data
     yet" response if the account has fewer than 14 days of recorded
     expenses. Shown on the Forecast page alongside the statistical charts.
- AI Assistant: chat interface backed by Gemini (current `google-genai` SDK
  and `gemini-2.5-flash` model — not the deprecated `google-generativeai`
  package or the shut-down `gemini-1.5-*`/`gemini-2.0-*` model families),
  grounded in the user's real transactions/budgets/goals; monthly AI summary
  endpoint; falls back to a data-only summary if no API key is configured, and
  fails fast (15s timeout) instead of hanging if the key/network is bad
- Settings: profile name, password change, currency selection, theme
  preference, notification toggle
- Modern glassmorphism dark UI, responsive sidebar + top navbar, toast
  notifications, loading states, and per-request error handling throughout

## Notes on scope

This build uses Google Gemini (current `google-genai` SDK) for conversational
AI analysis, and a dedicated LSTM neural network (TensorFlow/Keras) for
expense forecasting — trained per-user, on-demand, on that user's own
transaction history. That covers both "AI-powered financial analysis" and
"neural network" requirements without needing a separately hosted training
pipeline. If you also want a neural network used for classification (e.g.
auto-categorizing transactions from their notes text), that can be added the
same way — as a small on-demand model trained on the user's own categorized
history.
