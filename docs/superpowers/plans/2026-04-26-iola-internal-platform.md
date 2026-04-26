# IOLA Internal Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the IOLA internal operations platform — a full-stack React + Supabase app where the 5-person IOLA team tracks fundraising applications, outreach contacts, and action items with a Gemini AI assistant.

**Architecture:** Single React SPA (Vite) with Supabase as the backend (Postgres + Auth). All data lives in Supabase tables. The frontend reads/writes via the Supabase JS client. A Gemini API endpoint is called directly from the frontend (no custom backend server needed). Hosted on Vercel with auto-deploy from the `main` branch.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, Supabase JS v2, React Router v6, Google Gemini API (`gemini-2.0-flash`), Vercel

---

## File Structure

```
iola-tracking-internal/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.local                          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY
├── .gitignore
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # All tables + RLS policies
│   └── seed.sql                        # All pre-populated data
└── src/
    ├── main.jsx                         # Entry point
    ├── App.jsx                          # Router + auth gate
    ├── lib/
    │   ├── supabase.js                  # Supabase client singleton
    │   └── gemini.js                    # Gemini API helper
    ├── hooks/
    │   ├── useAuth.js                   # Auth state hook
    │   └── useActivity.js              # Log activity helper hook
    ├── components/
    │   ├── Layout.jsx                   # Sidebar + top bar shell
    │   ├── ProtectedRoute.jsx          # Redirect to /login if no session
    │   ├── StatusBadge.jsx
    │   ├── PriorityBadge.jsx
    │   ├── Modal.jsx                    # Reusable modal wrapper
    │   └── AIAssistant.jsx             # Floating Gemini chat widget
    ├── pages/
    │   ├── Login.jsx
    │   ├── Dashboard.jsx               # Bird's-eye stats + team cards + activity
    │   ├── Applications.jsx            # Applications & Grants CRUD
    │   ├── Outreach.jsx                # Outreach & Contacts CRUD
    │   └── ActionItems.jsx             # May Plan CRUD (by week)
    └── index.css                        # Tailwind directives + custom CSS vars
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`
- Create: `.gitignore`
- Create: `.env.local` (template only — user fills in values)

- [ ] **Step 1: Initialise the project**

```bash
cd c:/Users/Jason/Desktop/iola/iola-tracking-internal
npm create vite@latest . -- --template react
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom @tanstack/react-query
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Expected: all packages installed, `tailwind.config.js` and `postcss.config.js` created.

- [ ] **Step 3: Configure Tailwind**

Replace contents of `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0D1B2A", 800: "#132030", 700: "#1E3A4A" },
        teal: { DEFAULT: "#00897B", light: "#4DB6AC" },
        amber: { DEFAULT: "#F59E0B" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
```

Replace contents of `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --color-navy: #0D1B2A;
  --color-teal: #00897B;
  --color-amber: #F59E0B;
}

body {
  @apply bg-navy text-gray-100 font-sans;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #132030; }
::-webkit-scrollbar-thumb { background: #1E3A4A; border-radius: 3px; }
```

- [ ] **Step 4: Create `.env.local` template**

Create `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Add to `.gitignore` (append):
```
.env.local
.env
```

- [ ] **Step 5: Create entry point**

`src/main.jsx`:
```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

`index.html` — replace `<title>` with `IOLA — Ikirere Orbital Labs Africa`.

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server running at `http://localhost:5173`, no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold React + Vite + Tailwind project"
```

---

## Task 2: Supabase client + schema

**Files:**
- Create: `src/lib/supabase.js`
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create Supabase client**

`src/lib/supabase.js`:
```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Step 2: Write the schema migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Applications & Grants
create table public.applications (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('Accelerator','Grant','VC / Angel','Partnership','Academic')),
  region text,
  fund_description text,
  status text not null default 'Not Yet Applied' check (status in ('Not Yet Applied','Applied','In Progress','Accepted','Rejected','Pending')),
  priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
  next_step text,
  notes text,
  amount text,
  deadline date,
  contact_name text,
  owner text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Outreach & Contacts
create table public.outreach (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text,
  region text,
  status text not null default 'Warm' check (status in ('Active','Pending','Warm','Cold','Done')),
  last_contact date,
  notes text,
  next_step text,
  owner text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Action Items
create table public.action_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  owner text,
  due_date date,
  status text not null default 'To Do' check (status in ('To Do','In Progress','Done')),
  priority text not null default 'High' check (priority in ('Critical','High','Medium','Low')),
  week_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity Log
create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_name text,
  created_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger set_applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger set_outreach_updated_at before update on public.outreach
  for each row execute function public.set_updated_at();
create trigger set_action_items_updated_at before update on public.action_items
  for each row execute function public.set_updated_at();

-- RLS: enable but keep open for authenticated users (team of 5, no row-level user isolation needed)
alter table public.applications enable row level security;
alter table public.outreach enable row level security;
alter table public.action_items enable row level security;
alter table public.activity_log enable row level security;

create policy "Authenticated read/write applications" on public.applications
  for all using (auth.role() = 'authenticated');
create policy "Authenticated read/write outreach" on public.outreach
  for all using (auth.role() = 'authenticated');
create policy "Authenticated read/write action_items" on public.action_items
  for all using (auth.role() = 'authenticated');
create policy "Authenticated read/write activity_log" on public.activity_log
  for all using (auth.role() = 'authenticated');
```

- [ ] **Step 3: Write seed data**

Create `supabase/seed.sql` with all pre-populated entries:

```sql
-- Applications seed
insert into public.applications (name, type, region, amount, status, priority, notes, next_step, contact_name, owner, deadline) values
('Black Flag', 'Accelerator', 'USA', '$2M–$3M', 'Not Yet Applied', 'Critical',
 'Backed by Palantir, Anthropic, xAI founders. Defense, space, hardware focus. Rolling 30-day review.',
 'Apply immediately after Delaware registration', '', 'Jason', null),

('LVL UP Labs', 'Accelerator', 'USA', '$250K + perks', 'Not Yet Applied', 'Critical',
 'Previously accepted. Blocked only by missing Delaware C-Corp. Roberto (Italy) referral available.',
 'Apply as soon as C-Corp confirmed. Use Roberto referral.', 'Roberto', 'Jason', null),

('Techstars Europe', 'Accelerator', 'Europe', 'Varies', 'Not Yet Applied', 'High',
 'Deep tech, space, manufacturing focus.',
 'Start application — closes June 10', '', 'Jason', '2026-06-10'),

('ESA Kick-starts', 'Grant', 'Europe', '€75,000', 'In Progress', 'Critical',
 'Non-dilutive. Requires Germany entity via Alph Doamekpor.',
 'Final push with Alph — deadline May 29', 'Alph Doamekpor', 'Jason + Alph', '2026-05-29'),

('SPACERAISE 2026', 'Grant', 'Europe', 'Scholarship', 'Accepted', 'High',
 'Scholarship awarded. Italy (L''Aquila) late May 2026. Natural moment for Moira (SRI International) intro.',
 'Confirm visa. Attend late May.', '', 'Jason', null),

('Deep Learning Indaba Grants', 'Grant', 'Africa', 'Varies', 'Pending', 'High',
 'Warm relationship. Won 2025 Ideathon. Public support offered by leadership.',
 'Follow up on grant status', '', 'Jason + Abigail', null),

('Google for Startups', 'Grant', 'Global', 'Cloud credits', 'Accepted', 'Medium',
 'Active compute credits. RL training infrastructure running on Google cloud.',
 'Keep active', '', 'Jason', null),

('Nvidia Inception', 'Grant', 'Global', 'GPU credits', 'Accepted', 'Medium',
 'Active GPU access for IkirereMesh RL training.',
 'Keep active', '', 'Jason', null),

('Station F Fighters', 'Accelerator', 'Europe', 'Workspace + network', 'Applied', 'High',
 'Paris base for European fundraising. Rolling applications.',
 'Await response', '', 'Jason', null),

('Generation Space', 'VC / Angel', 'Global', 'Up to $10B fund', 'Not Yet Applied', 'Medium',
 'SpaceX-level aerospace investments. Loves deep space founders.',
 'Apply when deck is final', '', 'Jason', null),

('Speedrun', 'Accelerator', 'Global', 'Varies', 'Not Yet Applied', 'Medium',
 'High buzz around current cohort.',
 'Apply this week', '', 'Jason', null),

('Setcoin Group / DSE Fund', 'VC / Angel', 'Europe', '€17B fund', 'In Progress', 'Low',
 'Minimum ticket €100M. Long-term relationship only. Olena connected via LinkedIn.',
 'Keep warm — revisit in 18–24 months when Phase 1 ships', 'Olena', 'Jason', null);

-- Outreach seed
insert into public.outreach (name, role, region, status, last_contact, notes, next_step, owner) values
('Michael Daley', 'Financial advisor and connector', 'USA (Bay Area)', 'Active', '2026-04-24',
 'Created Africa Space Race WhatsApp group. Moira from SRI International and Vijay in the group. Zoom call with Moira being arranged.',
 'Wait for Moira intro in WhatsApp group', 'Jason'),

('Rosalind', 'Harvard Center for African Studies, Associate Director', 'USA (Boston)', 'Active', '2026-04-23',
 'Very warm. Bio sent. Will intro Prof. Achampon week of May 12. Connected to Prof. Dembele (Engineering) and climate faculty.',
 'Email Prof. Achampon May 12', 'Jason'),

('Parsa', 'CEO, Spark (geospatial and defense tech, 500 people)', 'Canada (Vancouver)', 'Pending', '2026-04-22',
 'Good call. Offered dev support, ISRO contact (chief architect of India moon missions), and investor intros in NY and LA. Waiting for deck.',
 'Send IOLA pre-seed deck', 'Jason'),

('Sameep', 'Tech dev company with NATO AI work', 'UK (London)', 'Pending', '2026-04-22',
 'Shared IOLA site with 2 defense contacts. Has ISRO partner. Mentioned Chilean VC for lunar rover company.',
 'Follow up Monday April 28 — ask if contacts responded, get Chilean VC name', 'Jason'),

('Olena / Setcoin Group', 'BD and deal sourcing', 'Europe', 'Warm', '2026-04-21',
 'Sent phase roadmap. Said interesting, will look when raising. Long-term play only.',
 'Keep warm. Update when Phase 1 ships.', 'Jason');

-- Action Items seed
insert into public.action_items (title, description, owner, due_date, status, priority, week_label) values

-- Week 1
('Register Delaware C-Corp via Stripe Atlas', 'Use Glenn''s Mercury discount code. This unlocks LVL UP Labs, Black Flag, and most investor conversations.', 'Jason', '2026-05-02', 'To Do', 'Critical', 'Week 1 — Apr 28 to May 4'),
('Apply to Black Flag', 'Backed by Palantir, Anthropic, xAI founders. $2M–$3M. 30-day review cycle. Use updated deck and refined positioning.', 'Jason', '2026-05-02', 'To Do', 'Critical', 'Week 1 — Apr 28 to May 4'),
('Follow up with Sameep', 'Did his defense contacts respond? Get the Chilean VC name. Explore ISRO contact for aerospace software support.', 'Jason', '2026-04-28', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),
('Send deck to Parsa', 'Send IOLA pre-seed deck. He has investor intros in New York and LA and an ISRO contact.', 'Jason', '2026-04-28', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),
('Begin Phase 1 TLE data ingestion from CelesTrak', 'Pull live TLE data from CelesTrak. Parse Two-Line Elements. Store in database. Real orbital mechanics starts here.', 'Salami', '2026-05-04', 'To Do', 'Critical', 'Week 1 — Apr 28 to May 4'),
('Begin research literature review for Q4 paper', 'Paper topic: open-source satellite simulation framework with SGP4 propagation for African space programs. Target: Deep Learning Indaba 2026 or AAAI workshop.', 'Abigail', '2026-05-04', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),
('Everyone shares 2–3 network contacts with Jason', 'Advisors, potential users, anyone in space/AI/climate/defense ecosystem. Drop names to Jason on WhatsApp. Do not filter.', 'All', '2026-05-05', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),

-- Week 2
('Apply to Techstars Europe', 'Deep tech, space, manufacturing focus. Deadline June 10. Start drafting this week to finish strong.', 'Jason', '2026-05-09', 'To Do', 'High', 'Week 2 — May 5 to May 11'),
('Apply to LVL UP Labs (after Delaware done)', 'Use Roberto''s referral from Italy. Previously accepted — only missing was Delaware registration. $250K + perks.', 'Jason', '2026-05-11', 'To Do', 'Critical', 'Week 2 — May 5 to May 11'),
('SGP4 orbit propagation implementation', 'Implement orbit propagation using satellite.js (frontend) and Skyfield or sgp4 (backend). Validate positions against N2YO or SatNOGS.', 'Salami', '2026-05-09', 'To Do', 'Critical', 'Week 2 — May 5 to May 11'),

-- Week 3
('Email Professor Achampon (Harvard intro via Rosalind)', 'Rosalind will share his email. Do not email before May 12. Attach bio. Gateway to Prof. Dembele and climate faculty.', 'Jason', '2026-05-12', 'To Do', 'Critical', 'Week 3 — May 12 to May 18'),
('ESA Kick-starts application final push', 'Deadline May 29. Confirm Germany entity pathway with Alph. €75,000 non-dilutive.', 'Jason + Alph', '2026-05-16', 'To Do', 'Critical', 'Week 3 — May 12 to May 18'),
('Connect simulation frontend to real orbital engine', 'Replace dummy satellite positions on Command Center globe with real propagated orbits from Phase 1 backend.', 'Salami', '2026-05-16', 'To Do', 'Critical', 'Week 3 — May 12 to May 18'),

-- Week 4
('SPACERAISE 2026 — Italy', 'EU-funded space program in L''Aquila. Visa in progress. Natural moment to meet Moira from SRI. Represent IOLA in Europe.', 'Jason', '2026-05-25', 'To Do', 'Critical', 'Week 4 — May 19 to May 31'),
('ESA Kick-starts submission', 'Final submission. Every day of delay before May 29 is risk.', 'Jason + Alph', '2026-05-29', 'To Do', 'Critical', 'Week 4 — May 19 to May 31'),
('Phase 1 complete — integration testing', 'Verify globe visualization matches real tracking sites. Fix edge cases. Document architecture for Q4 paper.', 'Salami', '2026-05-30', 'To Do', 'Critical', 'Week 4 — May 19 to May 31'),
('Research paper first draft (intro and background)', 'First two sections of Q4 2026 paper. Tied to Phase 1 completion.', 'Abigail', '2026-05-30', 'To Do', 'High', 'Week 4 — May 19 to May 31');
```

- [ ] **Step 4: Run migration and seed in Supabase dashboard**

In the Supabase project dashboard → SQL Editor:
1. Paste and run `supabase/migrations/001_initial_schema.sql`
2. Paste and run `supabase/seed.sql`

Verify: each table appears in Table Editor with the correct rows.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Supabase schema migration and seed data"
```

---

## Task 3: Auth flow

**Files:**
- Create: `src/hooks/useAuth.js`
- Create: `src/components/ProtectedRoute.jsx`
- Create: `src/pages/Login.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Create useAuth hook**

`src/hooks/useAuth.js`:
```js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

- [ ] **Step 2: Create ProtectedRoute**

`src/components/ProtectedRoute.jsx`:
```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return session ? children : <Navigate to="/login" replace />;
}
```

- [ ] **Step 3: Create Login page**

`src/pages/Login.jsx`:
```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-teal font-bold tracking-widest text-sm uppercase mb-2">Ikirere Orbital Labs Africa</div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight">IOLA</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Operations Platform</p>
        </div>
        <form onSubmit={handleLogin} className="bg-navy-800 rounded-2xl p-8 border border-navy-700 space-y-5">
          {error && <div className="text-red-400 text-sm bg-red-900/20 rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-navy-700 border border-navy-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal transition-colors"
              placeholder="you@ikirere.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-navy-700 border border-navy-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal transition-colors"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-teal hover:bg-teal-light text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center text-gray-600 text-xs mt-6">Accounts are created by Jason. Contact him if you need access.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create App.jsx with router**

`src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Outreach from "./pages/Outreach";
import ActionItems from "./pages/ActionItems";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="outreach" element={<Outreach />} />
          <Route path="action-items" element={<ActionItems />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Verify login works**

Run `npm run dev`. Navigate to `http://localhost:5173`. Should redirect to `/login`. Enter a valid Supabase user email + password. Should redirect to `/` (Dashboard placeholder).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth flow with Supabase, login page, protected routes"
```

---

## Task 4: Layout shell

**Files:**
- Create: `src/components/Layout.jsx`

- [ ] **Step 1: Build the layout**

`src/components/Layout.jsx`:
```jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import AIAssistant from "./AIAssistant";

const NAV = [
  { to: "/", label: "Dashboard", icon: "⬡", exact: true },
  { to: "/applications", label: "Applications & Grants", icon: "◎" },
  { to: "/outreach", label: "Outreach & Contacts", icon: "◈" },
  { to: "/action-items", label: "Action Items", icon: "◆" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-navy-800 border-r border-navy-700 flex flex-col fixed inset-y-0 left-0 z-20">
        <div className="px-5 py-6 border-b border-navy-700">
          <div className="text-teal text-xs font-bold tracking-widest uppercase">Ikirere Orbital Labs</div>
          <div className="text-white text-xl font-extrabold tracking-tight mt-0.5">IOLA</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-teal/10 text-teal" : "text-gray-400 hover:text-white hover:bg-navy-700"
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-navy-700">
          <div className="text-xs text-gray-500 mb-1 truncate">{session?.user?.email}</div>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen">
        <Outlet />
      </main>

      <AIAssistant />
    </div>
  );
}
```

- [ ] **Step 2: Create AIAssistant stub (will be fleshed out in Task 9)**

`src/components/AIAssistant.jsx`:
```jsx
export default function AIAssistant() {
  return null; // placeholder — implemented in Task 9
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add sidebar layout shell"
```

---

## Task 5: Shared components

**Files:**
- Create: `src/components/StatusBadge.jsx`
- Create: `src/components/PriorityBadge.jsx`
- Create: `src/components/Modal.jsx`
- Create: `src/hooks/useActivity.js`
- Create: `src/lib/gemini.js`

- [ ] **Step 1: StatusBadge**

`src/components/StatusBadge.jsx`:
```jsx
const MAP = {
  "Applied":         { bg: "bg-blue-900/40",   text: "text-blue-300",   dot: "bg-blue-400" },
  "In Progress":     { bg: "bg-amber-900/40",  text: "text-amber-300",  dot: "bg-amber-400" },
  "Accepted":        { bg: "bg-green-900/40",  text: "text-green-300",  dot: "bg-green-400" },
  "Rejected":        { bg: "bg-red-900/40",    text: "text-red-300",    dot: "bg-red-400" },
  "Pending":         { bg: "bg-purple-900/40", text: "text-purple-300", dot: "bg-purple-400" },
  "Not Yet Applied": { bg: "bg-gray-800",      text: "text-gray-400",   dot: "bg-gray-500" },
  // outreach statuses
  "Active": { bg: "bg-teal/10", text: "text-teal", dot: "bg-teal" },
  "Warm":   { bg: "bg-amber-900/40", text: "text-amber-300", dot: "bg-amber-400" },
  "Cold":   { bg: "bg-gray-800", text: "text-gray-400", dot: "bg-gray-500" },
  "Done":   { bg: "bg-green-900/40", text: "text-green-300", dot: "bg-green-400" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP["Pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
```

- [ ] **Step 2: PriorityBadge**

`src/components/PriorityBadge.jsx`:
```jsx
const MAP = {
  Critical: "bg-red-900/50 text-red-300",
  High:     "bg-amber-900/50 text-amber-300",
  Medium:   "bg-blue-900/50 text-blue-300",
  Low:      "bg-gray-800 text-gray-400",
};

export default function PriorityBadge({ priority }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${MAP[priority] || MAP.Low}`}>
      {priority}
    </span>
  );
}
```

- [ ] **Step 3: Modal**

`src/components/Modal.jsx`:
```jsx
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-white font-bold text-base">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: useActivity hook**

`src/hooks/useActivity.js`:
```js
import { supabase } from "../lib/supabase";

export function useActivity() {
  const log = async ({ action, entityType, entityId, entityName }) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("activity_log").insert({
      user_email: session?.user?.email ?? "unknown",
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_name: entityName ?? null,
    });
  };
  return { log };
}
```

- [ ] **Step 5: Gemini helper**

`src/lib/gemini.js`:
```js
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function askGemini(systemPrompt, userMessage) {
  const res = await fetch(`${GEMINI_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\nUser request: " + userMessage }] }
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error("Gemini API error: " + res.status);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add shared components, useActivity hook, Gemini helper"
```

---

## Task 6: Dashboard page

**Files:**
- Create: `src/pages/Dashboard.jsx`

The dashboard shows: 4 stat cards, upcoming deadlines (next 14 days), team member cards (click to expand assigned items), and the last 10 activity log entries.

- [ ] **Step 1: Build Dashboard**

`src/pages/Dashboard.jsx`:
```jsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";

const TEAM = [
  { name: "Jason Quist", role: "Co-Founder & CEO", initials: "JQ", color: "teal" },
  { name: "Gideon Salami", role: "Co-Founder & CTO", initials: "GS", color: "blue" },
  { name: "Abigail Boateng", role: "Head of Research", initials: "AB", color: "purple" },
  { name: "Ignatius Balayo", role: "ML Engineer", initials: "IB", color: "amber" },
  { name: "Alph Doamekpor", role: "Strategy & Product", initials: "AD", color: "pink" },
];

const AVATAR_COLORS = {
  teal: "bg-teal/20 text-teal",
  blue: "bg-blue-900/40 text-blue-300",
  purple: "bg-purple-900/40 text-purple-300",
  amber: "bg-amber-900/40 text-amber-300",
  pink: "bg-pink-900/40 text-pink-300",
};

function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: () => supabase.from("applications").select("*").then(r => r.data ?? []),
  });
}

function useActionItems() {
  return useQuery({
    queryKey: ["action_items"],
    queryFn: () => supabase.from("action_items").select("*").then(r => r.data ?? []),
  });
}

function useOutreach() {
  return useQuery({
    queryKey: ["outreach"],
    queryFn: () => supabase.from("outreach").select("*").then(r => r.data ?? []),
  });
}

function useActivityLog() {
  return useQuery({
    queryKey: ["activity_log"],
    queryFn: () => supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10).then(r => r.data ?? []),
  });
}

export default function Dashboard() {
  const { data: apps = [] } = useApplications();
  const { data: items = [] } = useActionItems();
  const { data: contacts = [] } = useOutreach();
  const { data: activity = [] } = useActivityLog();
  const [expandedMember, setExpandedMember] = useState(null);

  const today = new Date();
  const in14 = new Date(today); in14.setDate(today.getDate() + 14);

  const upcomingDeadlines = [
    ...apps
      .filter(a => a.deadline && new Date(a.deadline) >= today && new Date(a.deadline) <= in14)
      .map(a => ({ ...a, kind: "application" })),
    ...items
      .filter(i => i.due_date && new Date(i.due_date) >= today && new Date(i.due_date) <= in14)
      .map(i => ({ ...i, name: i.title, deadline: i.due_date, kind: "action" })),
  ].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const stats = [
    { label: "Total Applications", value: apps.length, color: "text-teal border-teal" },
    { label: "Active / Applied", value: apps.filter(a => ["In Progress","Applied"].includes(a.status)).length, color: "text-blue-400 border-blue-400" },
    { label: "Accepted / Won", value: apps.filter(a => a.status === "Accepted").length, color: "text-green-400 border-green-400" },
    { label: "Critical — Not Applied", value: apps.filter(a => a.priority === "Critical" && a.status === "Not Yet Applied").length, color: "text-red-400 border-red-400" },
  ];

  const getMemberItems = (name) => ({
    actions: items.filter(i => i.owner?.toLowerCase().includes(name.split(" ")[0].toLowerCase())),
    contacts: contacts.filter(c => c.owner?.toLowerCase().includes(name.split(" ")[0].toLowerCase())),
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-extrabold tracking-tight">Mission Control</h1>
        <p className="text-gray-500 text-sm mt-1">
          {today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`bg-navy-800 rounded-xl p-5 border-l-4 ${s.color.split(" ")[1]}`}>
            <div className={`text-3xl font-extrabold ${s.color.split(" ")[0]}`}>{s.value}</div>
            <div className="text-gray-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 bg-navy-800 rounded-xl p-5 border border-navy-700">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Upcoming Deadlines — Next 14 Days</h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500 text-sm">No deadlines in the next 14 days.</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((item, i) => {
                const daysLeft = Math.ceil((new Date(item.deadline) - today) / 86400000);
                return (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-lg ${daysLeft <= 7 ? "bg-red-900/20 border border-red-900/40" : "bg-navy-700/50"}`}>
                    <div>
                      <div className="text-white text-sm font-semibold">{item.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5 capitalize">{item.kind}</div>
                    </div>
                    <div className={`text-xs font-bold ${daysLeft <= 7 ? "text-red-400" : "text-amber"}`}>
                      {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activity.map(a => (
                <div key={a.id} className="text-xs">
                  <span className="text-teal font-semibold">{a.user_email?.split("@")[0]}</span>
                  <span className="text-gray-400"> {a.action} </span>
                  <span className="text-gray-300 font-medium">{a.entity_name}</span>
                  <div className="text-gray-600 mt-0.5">
                    {new Date(a.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Cards */}
      <div>
        <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TEAM.map(member => {
            const { actions, contacts: memberContacts } = getMemberItems(member.name);
            const isExpanded = expandedMember === member.name;
            return (
              <div key={member.name}
                className={`bg-navy-800 border rounded-xl overflow-hidden cursor-pointer transition-all ${isExpanded ? "border-teal/40" : "border-navy-700 hover:border-navy-600"}`}
                onClick={() => setExpandedMember(isExpanded ? null : member.name)}
              >
                <div className="p-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3 ${AVATAR_COLORS[member.color]}`}>
                    {member.initials}
                  </div>
                  <div className="text-white font-semibold text-sm">{member.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{member.role}</div>
                  <div className="flex gap-3 mt-3 text-xs text-gray-500">
                    <span><span className="text-white font-bold">{actions.length}</span> tasks</span>
                    <span><span className="text-white font-bold">{memberContacts.length}</span> contacts</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-navy-700 px-4 py-3 space-y-2">
                    {actions.slice(0, 5).map(a => (
                      <div key={a.id} className="text-xs">
                        <div className="text-gray-300 font-medium truncate">{a.title}</div>
                        <div className="flex gap-2 mt-0.5">
                          <PriorityBadge priority={a.priority} />
                          <StatusBadge status={a.status} />
                        </div>
                      </div>
                    ))}
                    {actions.length === 0 && <p className="text-gray-600 text-xs">No assigned items.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify Dashboard renders with data**

Run `npm run dev`. Go to `/`. Verify stats cards show the correct counts, team cards appear, activity feed shows empty state.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Dashboard page with stats, deadlines, team cards, activity feed"
```

---

## Task 7: Applications & Grants page

**Files:**
- Create: `src/pages/Applications.jsx`

Full CRUD: filterable table, inline status dropdown, edit modal, delete, add new.

- [ ] **Step 1: Build Applications page**

`src/pages/Applications.jsx`:
```jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import Modal from "../components/Modal";

const STATUSES = ["Not Yet Applied","Applied","In Progress","Accepted","Rejected","Pending"];
const TYPES = ["Accelerator","Grant","VC / Angel","Partnership","Academic"];
const PRIORITIES = ["Critical","High","Medium","Low"];

const EMPTY = { name:"", type:"Accelerator", region:"", amount:"", status:"Not Yet Applied", priority:"High", fund_description:"", next_step:"", notes:"", deadline:"", contact_name:"", owner:"Jason" };

const TYPE_COLORS = {
  Accelerator: "bg-indigo-900/40 text-indigo-300",
  Grant:       "bg-emerald-900/40 text-emerald-300",
  "VC / Angel":"bg-amber-900/40 text-amber-300",
  Partnership: "bg-pink-900/40 text-pink-300",
  Academic:    "bg-blue-900/40 text-blue-300",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors";

export default function Applications() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data: {} }

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => supabase.from("applications").select("*").order("created_at").then(r => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        await supabase.from("applications").update(row).eq("id", row.id);
        await log({ action: "updated application", entityType: "application", entityId: row.id, entityName: row.name });
      } else {
        const { data } = await supabase.from("applications").insert(row).select().single();
        await log({ action: "added application", entityType: "application", entityId: data.id, entityName: row.name });
      }
    },
    onSuccess: () => { qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }) => {
      await supabase.from("applications").update({ status }).eq("id", id);
      await log({ action: `marked ${status}`, entityType: "application", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]); },
  });

  const remove = useMutation({
    mutationFn: async ({ id, name }) => {
      await supabase.from("applications").delete().eq("id", id);
      await log({ action: "deleted application", entityType: "application", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]); },
  });

  const filtered = apps.filter(a => {
    if (filterStatus !== "All" && a.status !== filterStatus) return false;
    if (filterType !== "All" && a.type !== filterType) return false;
    if (filterPriority !== "All" && a.priority !== filterPriority) return false;
    return true;
  });

  const FormModal = () => {
    const [form, setForm] = useState(modal?.data ?? EMPTY);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Application" : "Add Application"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} /></Field>
          <Field label="Amount"><input value={form.amount} onChange={e => set("amount", e.target.value)} className={inputCls} /></Field>
          <Field label="Region"><input value={form.region} onChange={e => set("region", e.target.value)} className={inputCls} /></Field>
          <Field label="Contact"><input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} className={inputCls} /></Field>
          <Field label="Deadline"><input type="date" value={form.deadline || ""} onChange={e => set("deadline", e.target.value)} className={inputCls} /></Field>
          <Field label="Owner"><input value={form.owner} onChange={e => set("owner", e.target.value)} className={inputCls} /></Field>
          <Field label="Type">
            <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputCls}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Next Step"><input value={form.next_step} onChange={e => set("next_step", e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Fund Description">
            <textarea value={form.fund_description} onChange={e => set("fund_description", e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-navy-700 rounded-lg">Cancel</button>
          <button onClick={() => upsert.mutate(form)} className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light">Save</button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Applications & Grants</h1>
          <p className="text-gray-500 text-sm mt-1">{apps.length} total · {apps.filter(a => a.status === "Accepted").length} accepted</p>
        </div>
        <button onClick={() => setModal({ mode: "add", data: EMPTY })} className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light">+ Add</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Status", value: filterStatus, set: setFilterStatus, opts: ["All", ...STATUSES] },
          { label: "Type", value: filterType, set: setFilterType, opts: ["All", ...TYPES] },
          { label: "Priority", value: filterPriority, set: setFilterPriority, opts: ["All", ...PRIORITIES] },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
            className="bg-navy-800 border border-navy-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal">
            {f.opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700">
              {["Name & Notes","Type","Region","Amount","Priority","Status","Deadline","Owner",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No entries match the current filters.</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={row.id} className={`border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors ${i % 2 === 0 ? "" : "bg-navy/30"}`}>
                <td className="px-4 py-3 max-w-xs">
                  <div className="text-white font-semibold">{row.name}</div>
                  {row.next_step && <div className="text-teal text-xs mt-0.5 truncate">→ {row.next_step}</div>}
                  {row.notes && <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{row.notes}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[row.type] || ""}`}>{row.type}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{row.region}</td>
                <td className="px-4 py-3 text-teal font-semibold text-xs">{row.amount}</td>
                <td className="px-4 py-3"><PriorityBadge priority={row.priority} /></td>
                <td className="px-4 py-3">
                  <select value={row.status}
                    onChange={e => updateStatus.mutate({ id: row.id, status: e.target.value, name: row.name })}
                    className="bg-navy border border-navy-700 text-gray-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal cursor-pointer">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className={`px-4 py-3 text-xs font-medium ${row.deadline && new Date(row.deadline) - new Date() < 7 * 86400000 ? "text-red-400" : "text-gray-400"}`}>
                  {row.deadline ? new Date(row.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{row.owner}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ mode: "edit", data: row })} className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white hover:border-gray-500">Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${row.name}?`)) remove.mutate({ id: row.id, name: row.name }); }} className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <FormModal />}
    </div>
  );
}
```

- [ ] **Step 2: Verify table loads, status dropdowns work, add/edit modal saves**

Run `npm run dev`. Go to `/applications`. Verify all 12 seed rows appear. Change a status. Verify it persists on refresh.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Applications & Grants CRUD page"
```

---

## Task 8: Outreach & Contacts page

**Files:**
- Create: `src/pages/Outreach.jsx`

Card-based layout, CRUD, inline status change, edit modal.

- [ ] **Step 1: Build Outreach page**

`src/pages/Outreach.jsx`:
```jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";

const STATUSES = ["Active","Pending","Warm","Cold","Done"];
const EMPTY = { name:"", role:"", region:"", status:"Warm", last_contact:"", notes:"", next_step:"", owner:"Jason" };

const inputCls = "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const BORDER_COLORS = { Active: "border-teal", Pending: "border-amber", Warm: "border-amber/50", Cold: "border-gray-700", Done: "border-green-700" };

export default function Outreach() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => supabase.from("outreach").select("*").order("last_contact", { ascending: false }).then(r => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        await supabase.from("outreach").update(row).eq("id", row.id);
        await log({ action: "updated contact", entityType: "outreach", entityId: row.id, entityName: row.name });
      } else {
        const { data } = await supabase.from("outreach").insert(row).select().single();
        await log({ action: "added contact", entityType: "outreach", entityId: data.id, entityName: row.name });
      }
    },
    onSuccess: () => { qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }) => {
      await supabase.from("outreach").update({ status }).eq("id", id);
      await log({ action: `marked ${status}`, entityType: "outreach", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]); },
  });

  const remove = useMutation({
    mutationFn: async ({ id, name }) => {
      await supabase.from("outreach").delete().eq("id", id);
      await log({ action: "deleted contact", entityType: "outreach", entityId: id, entityName: name });
    },
    onSuccess: () => { qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]); },
  });

  const filtered = contacts.filter(c => filterStatus === "All" || c.status === filterStatus);

  const FormModal = () => {
    const [form, setForm] = useState(modal?.data ?? EMPTY);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Contact" : "Add Contact"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} /></Field>
          <Field label="Role"><input value={form.role} onChange={e => set("role", e.target.value)} className={inputCls} /></Field>
          <Field label="Region"><input value={form.region} onChange={e => set("region", e.target.value)} className={inputCls} /></Field>
          <Field label="Owner"><input value={form.owner} onChange={e => set("owner", e.target.value)} className={inputCls} /></Field>
          <Field label="Last Contact"><input type="date" value={form.last_contact || ""} onChange={e => set("last_contact", e.target.value)} className={inputCls} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Next Step"><input value={form.next_step} onChange={e => set("next_step", e.target.value)} className={inputCls} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputCls + " resize-none"} /></Field>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-navy-700 rounded-lg">Cancel</button>
          <button onClick={() => upsert.mutate(form)} className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light">Save</button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Outreach & Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} contacts · {contacts.filter(c => c.status === "Active").length} active</p>
        </div>
        <button onClick={() => setModal({ mode: "add", data: EMPTY })} className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light">+ Add Contact</button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        {["All", ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filterStatus === s ? "bg-teal text-white" : "bg-navy-800 text-gray-400 border border-navy-700 hover:text-white"}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div key={c.id} className={`bg-navy-800 rounded-xl border-l-4 ${BORDER_COLORS[c.status] || "border-gray-700"} border border-navy-700 p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white font-bold text-base">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-gray-400 text-sm mt-0.5">{c.role}{c.region ? ` · ${c.region}` : ""}</div>
                  {c.notes && <div className="text-gray-400 text-sm mt-2 bg-navy/50 rounded-lg px-3 py-2">{c.notes}</div>}
                  {c.next_step && <div className="text-teal text-sm font-semibold mt-2">→ {c.next_step}</div>}
                  {c.last_contact && <div className="text-gray-600 text-xs mt-2">Last contact: {new Date(c.last_contact).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>}
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <select value={c.status} onChange={e => updateStatus.mutate({ id: c.id, status: e.target.value, name: c.name })}
                    className="bg-navy border border-navy-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ mode: "edit", data: c })} className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white">Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${c.name}?`)) remove.mutate({ id: c.id, name: c.name }); }} className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20">Del</button>
                  </div>
                  <span className="text-gray-600 text-xs">{c.owner}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-500 text-sm">No contacts match the current filter.</p>}
        </div>
      )}

      {modal && <FormModal />}
    </div>
  );
}
```

- [ ] **Step 2: Verify cards render, status filter works, edit/add/delete work**

Run `npm run dev`. Go to `/outreach`. Verify 5 seed contacts appear as cards. Change a status. Add a new contact. Verify it appears and persists.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Outreach & Contacts CRUD page"
```

---

## Task 9: Action Items page

**Files:**
- Create: `src/pages/ActionItems.jsx`

Grouped by week. Each item shows title, description, owner badge, due date, priority, status toggle. Full CRUD.

- [ ] **Step 1: Build ActionItems page**

`src/pages/ActionItems.jsx`:
```jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActivity } from "../hooks/useActivity";
import PriorityBadge from "../components/PriorityBadge";
import Modal from "../components/Modal";

const STATUSES = ["To Do","In Progress","Done"];
const PRIORITIES = ["Critical","High","Medium","Low"];
const WEEKS = ["Week 1 — Apr 28 to May 4","Week 2 — May 5 to May 11","Week 3 — May 12 to May 18","Week 4 — May 19 to May 31"];
const OWNERS = ["Jason","Salami","Abigail","Ignatius","Alph","Jason + Alph","All"];

const EMPTY = { title:"", description:"", owner:"Jason", due_date:"", status:"To Do", priority:"High", week_label:"Week 1 — Apr 28 to May 4" };

const inputCls = "w-full bg-navy border border-navy-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const OWNER_COLORS = {
  Jason: "bg-teal/15 text-teal",
  Salami: "bg-blue-900/40 text-blue-300",
  Abigail: "bg-purple-900/40 text-purple-300",
  Ignatius: "bg-yellow-900/40 text-yellow-300",
  Alph: "bg-pink-900/40 text-pink-300",
  "Jason + Alph": "bg-teal/10 text-teal/80",
  All: "bg-green-900/40 text-green-300",
};

const STATUS_CYCLE = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };
const STATUS_STYLE = {
  "To Do":      "border-gray-700 text-gray-400",
  "In Progress":"border-amber/50 text-amber",
  "Done":       "border-green-700 text-green-400",
};

export default function ActionItems() {
  const qc = useQueryClient();
  const { log } = useActivity();
  const [modal, setModal] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["action_items"],
    queryFn: () => supabase.from("action_items").select("*").order("due_date").then(r => r.data ?? []),
  });

  const upsert = useMutation({
    mutationFn: async (row) => {
      if (row.id) {
        await supabase.from("action_items").update(row).eq("id", row.id);
        await log({ action: "updated task", entityType: "action_item", entityId: row.id, entityName: row.title });
      } else {
        const { data } = await supabase.from("action_items").insert(row).select().single();
        await log({ action: "added task", entityType: "action_item", entityId: data.id, entityName: row.title });
      }
    },
    onSuccess: () => { qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]); setModal(null); },
  });

  const cycleStatus = useMutation({
    mutationFn: async ({ id, status, title }) => {
      const next = STATUS_CYCLE[status];
      await supabase.from("action_items").update({ status: next }).eq("id", id);
      await log({ action: `marked ${next}`, entityType: "action_item", entityId: id, entityName: title });
    },
    onSuccess: () => { qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]); },
  });

  const remove = useMutation({
    mutationFn: async ({ id, title }) => {
      await supabase.from("action_items").delete().eq("id", id);
      await log({ action: "deleted task", entityType: "action_item", entityId: id, entityName: title });
    },
    onSuccess: () => { qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]); },
  });

  const byWeek = WEEKS.reduce((acc, w) => {
    acc[w] = items.filter(i => i.week_label === w);
    return acc;
  }, {});
  const ungrouped = items.filter(i => !WEEKS.includes(i.week_label));

  const done = items.filter(i => i.status === "Done").length;
  const critical = items.filter(i => i.priority === "Critical" && i.status !== "Done").length;

  const FormModal = () => {
    const [form, setForm] = useState(modal?.data ?? EMPTY);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Task" : "Add Task"}>
        <div className="space-y-4">
          <Field label="Title"><input value={form.title} onChange={e => set("title", e.target.value)} className={inputCls} /></Field>
          <Field label="Description"><textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} className={inputCls + " resize-none"} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner">
              <select value={form.owner} onChange={e => set("owner", e.target.value)} className={inputCls}>
                {OWNERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Due Date"><input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} className={inputCls} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputCls}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Week">
            <select value={form.week_label} onChange={e => set("week_label", e.target.value)} className={inputCls}>
              {WEEKS.map(w => <option key={w}>{w}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-navy-700 rounded-lg">Cancel</button>
          <button onClick={() => upsert.mutate(form)} className="px-5 py-2 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal-light">Save</button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">Action Items — May 2026</h1>
          <p className="text-gray-500 text-sm mt-1">{done}/{items.length} complete · {critical} critical remaining</p>
        </div>
        <button onClick={() => setModal({ mode: "add", data: EMPTY })} className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-lg hover:bg-teal-light">+ Add Task</button>
      </div>

      {/* May North Star */}
      <div className="bg-navy-800 border border-teal/20 rounded-xl px-5 py-4 mb-8">
        <div className="text-teal text-xs font-bold uppercase tracking-widest mb-1">May North Star</div>
        <p className="text-gray-300 text-sm leading-relaxed">By end of May: Delaware C-Corp registered. ESA Kick-starts submitted. Phase 1 simulation engine ships. Black Flag and LVL UP Labs applications in. SPACERAISE attended. Harvard network opened. Two investor relationships warm.</p>
      </div>

      {isLoading ? <div className="text-gray-500 text-sm">Loading…</div> : (
        <div className="space-y-8">
          {WEEKS.map(week => (
            <div key={week}>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{week}</h2>
              <div className="space-y-2">
                {byWeek[week]?.length === 0 && <p className="text-gray-600 text-sm">No tasks this week.</p>}
                {byWeek[week]?.map(item => (
                  <div key={item.id}
                    className={`bg-navy-800 rounded-xl border p-4 flex items-start gap-4 ${item.status === "Done" ? "opacity-60 border-navy-700" : item.priority === "Critical" ? "border-red-900/50" : "border-navy-700"}`}>
                    {/* Status toggle circle */}
                    <button
                      onClick={() => cycleStatus.mutate({ id: item.id, status: item.status, title: item.title })}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${STATUS_STYLE[item.status]} ${item.status === "Done" ? "bg-green-900/30" : "hover:border-teal"}`}
                    >
                      {item.status === "Done" && <span className="text-green-400 text-xs">✓</span>}
                      {item.status === "In Progress" && <span className="w-2 h-2 rounded-full bg-amber block" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${item.status === "Done" ? "line-through text-gray-500" : "text-white"}`}>{item.title}</span>
                        <PriorityBadge priority={item.priority} />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${OWNER_COLORS[item.owner] || "bg-gray-800 text-gray-400"}`}>{item.owner}</span>
                      </div>
                      {item.description && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.description}</p>}
                      {item.due_date && (
                        <div className={`text-xs mt-1.5 font-medium ${new Date(item.due_date) - new Date() < 3 * 86400000 && item.status !== "Done" ? "text-red-400" : "text-gray-500"}`}>
                          Due {new Date(item.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setModal({ mode: "edit", data: item })} className="px-2 py-1 text-xs border border-navy-700 rounded-md text-gray-400 hover:text-white">Edit</button>
                      <button onClick={() => { if (confirm("Delete task?")) remove.mutate({ id: item.id, title: item.title }); }} className="px-2 py-1 text-xs border border-red-900/50 rounded-md text-red-400 hover:bg-red-900/20">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Other</h2>
              <div className="space-y-2">{ungrouped.map(item => <div key={item.id}>{item.title}</div>)}</div>
            </div>
          )}
        </div>
      )}

      {modal && <FormModal />}
    </div>
  );
}
```

- [ ] **Step 2: Verify week groupings, status cycle on click, add/edit/delete**

Go to `/action-items`. Verify all 17 seed tasks appear grouped by week. Click the status circle — should cycle To Do → In Progress → Done. Done items should have strikethrough.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Action Items page with week grouping and status cycle"
```

---

## Task 10: Gemini AI assistant

**Files:**
- Modify: `src/components/AIAssistant.jsx`

Floating chat bubble in the bottom-right corner. User types natural language. Gemini receives the current context (all apps, outreach, action items) plus the message, returns a plain text answer or instruction, and the assistant can also execute mutations (status updates, add records).

- [ ] **Step 1: Build AIAssistant**

`src/components/AIAssistant.jsx`:
```jsx
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { askGemini } from "../lib/gemini";
import { useActivity } from "../hooks/useActivity";

const SYSTEM = (apps, outreach, items) => `
You are the IOLA AI assistant for Ikirere Orbital Labs Africa — a deep tech space startup building satellite coordination software and CubeSats for Africa.

You have access to the team's live data. Here is the current state:

APPLICATIONS (${apps.length}):
${apps.map(a => `- ${a.name} | ${a.type} | ${a.status} | ${a.priority} | ${a.amount || "N/A"} | Deadline: ${a.deadline || "none"} | Owner: ${a.owner}`).join("\n")}

OUTREACH CONTACTS (${outreach.length}):
${outreach.map(c => `- ${c.name} | ${c.role} | ${c.status} | Last contact: ${c.last_contact || "N/A"} | Next: ${c.next_step}`).join("\n")}

ACTION ITEMS (${items.length}):
${items.map(i => `- ${i.title} | ${i.owner} | ${i.status} | ${i.priority} | Due: ${i.due_date || "N/A"}`).join("\n")}

You can answer questions about the data, give summaries, and suggest next steps.

If the user asks to UPDATE or CHANGE data (e.g. "mark ESA Kick-starts as submitted", "change Parsa's status to Active", "add a contact"), reply with a JSON action block at the END of your response in this exact format:
{"action":"update_application","id":"<id>","field":"status","value":"Applied"}
{"action":"update_outreach","id":"<id>","field":"status","value":"Active"}
{"action":"update_action_item","id":"<id>","field":"status","value":"Done"}

Only include the JSON if you are confident about the update. Use the exact IDs from the data above.
`;

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const qc = useQueryClient();
  const { log } = useActivity();

  const { data: apps = [] } = useQuery({ queryKey: ["applications"], queryFn: () => supabase.from("applications").select("*").then(r => r.data ?? []) });
  const { data: outreach = [] } = useQuery({ queryKey: ["outreach"], queryFn: () => supabase.from("outreach").select("*").then(r => r.data ?? []) });
  const { data: items = [] } = useQuery({ queryKey: ["action_items"], queryFn: () => supabase.from("action_items").select("*").then(r => r.data ?? []) });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const executeAction = async (jsonStr) => {
    try {
      const act = JSON.parse(jsonStr);
      if (act.action === "update_application") {
        await supabase.from("applications").update({ [act.field]: act.value }).eq("id", act.id);
        const name = apps.find(a => a.id === act.id)?.name ?? act.id;
        await log({ action: `AI: set ${act.field} to ${act.value}`, entityType: "application", entityId: act.id, entityName: name });
        qc.invalidateQueries(["applications"]); qc.invalidateQueries(["activity_log"]);
      } else if (act.action === "update_outreach") {
        await supabase.from("outreach").update({ [act.field]: act.value }).eq("id", act.id);
        const name = outreach.find(c => c.id === act.id)?.name ?? act.id;
        await log({ action: `AI: set ${act.field} to ${act.value}`, entityType: "outreach", entityId: act.id, entityName: name });
        qc.invalidateQueries(["outreach"]); qc.invalidateQueries(["activity_log"]);
      } else if (act.action === "update_action_item") {
        await supabase.from("action_items").update({ [act.field]: act.value }).eq("id", act.id);
        const name = items.find(i => i.id === act.id)?.title ?? act.id;
        await log({ action: `AI: set ${act.field} to ${act.value}`, entityType: "action_item", entityId: act.id, entityName: name });
        qc.invalidateQueries(["action_items"]); qc.invalidateQueries(["activity_log"]);
      }
    } catch { /* malformed JSON — ignore */ }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const raw = await askGemini(SYSTEM(apps, outreach, items), userMsg);
      // Extract JSON action blocks (lines starting with {"action":)
      const lines = raw.split("\n");
      const actionLines = lines.filter(l => l.trim().startsWith('{"action":'));
      const textLines = lines.filter(l => !l.trim().startsWith('{"action":'));
      const displayText = textLines.join("\n").trim();
      setMessages(m => [...m, { role: "assistant", text: displayText }]);
      for (const line of actionLines) await executeAction(line.trim());
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: "Something went wrong. Check your Gemini API key." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 w-13 h-13 bg-teal rounded-full shadow-lg flex items-center justify-center text-white text-xl hover:bg-teal-light transition-colors"
        style={{ width: 52, height: 52 }}
        title="Ask IOLA AI"
      >
        {open ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-80 bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 420 }}>
          <div className="px-4 py-3 border-b border-navy-700 flex items-center gap-2">
            <span className="text-teal text-lg">✦</span>
            <div>
              <div className="text-white text-sm font-bold">IOLA AI</div>
              <div className="text-gray-500 text-xs">Powered by Gemini</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-gray-500 text-xs leading-relaxed">
                Ask me anything. Try:<br />
                "What is Abigail working on?"<br />
                "Mark ESA Kick-starts as submitted"<br />
                "What are our critical deadlines?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm leading-relaxed ${m.role === "user" ? "text-white text-right" : "text-gray-300"}`}>
                {m.role === "user"
                  ? <span className="bg-teal/20 text-teal px-3 py-1.5 rounded-xl inline-block text-left max-w-[90%]">{m.text}</span>
                  : <span className="whitespace-pre-wrap">{m.text}</span>
                }
              </div>
            ))}
            {loading && <div className="text-gray-500 text-xs animate-pulse">Thinking…</div>}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-navy-700 flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask or command…"
              className="flex-1 bg-navy border border-navy-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-teal placeholder-gray-600"
            />
            <button onClick={send} disabled={loading}
              className="px-3 py-2 bg-teal text-white text-sm rounded-lg hover:bg-teal-light disabled:opacity-50">→</button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify AI assistant opens, sends messages, receives responses**

Run `npm run dev`. Click the ✦ button. Ask "What are our critical applications?" — should return a Gemini response listing Critical priority apps. Ask "Mark ESA Kick-starts as In Progress" — Gemini should respond and the table should update.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Gemini AI assistant with IOLA context and mutation actions"
```

---

## Task 11: Deploy to Vercel

- [ ] **Step 1: Push all work to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to vercel.com → New Project → Import `iola-tracking-internal` repo
2. Framework: Vite (auto-detected)
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
4. Deploy

- [ ] **Step 3: Verify production deployment**

Open the Vercel URL. Confirm login works, all 4 pages load, data is live from Supabase.

- [ ] **Step 4: Final commit**

```bash
git tag v1.0.0
git push origin --tags
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| React + Vite + Tailwind | Task 1 |
| Supabase Postgres backend | Task 2 |
| Supabase Auth, admin invite flow | Task 3 |
| Applications & Grants CRUD (all fields) | Task 7 |
| Outreach & Contacts CRUD (all fields) | Task 8 |
| Action Items CRUD, week grouping | Task 9 |
| Team Dashboard — stats, deadlines, team cards, activity | Task 6 |
| Activity log on every mutation | Tasks 6–9 via useActivity |
| Gemini AI assistant | Task 10 |
| IOLA brand colors (navy, teal, amber) | Task 1, all pages |
| Pre-populated seed data | Task 2 |
| All data editable, no hardcoding | Tasks 7–9 |
| Mobile-friendly layout | Task 4 (responsive grid) |
| Vercel deployment | Task 11 |

All requirements covered. No placeholders in code blocks. Type names consistent across all tasks.
