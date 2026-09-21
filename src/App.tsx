import { FormEvent, ReactNode, useEffect, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  Flame,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'

type AuthMode = 'login' | 'register'
type View = 'overview' | 'workouts'

type AuthResponse = {
  token: string
  tenantId: string
  email: string
  role: string
}

type Exercise = {
  id?: string
  name: string
  sets: number
  reps: number
  weightKg?: number | null
  durationMinutes?: number | null
  notes?: string | null
}

type Workout = {
  id: string
  title: string
  date: string
  notes?: string | null
  durationMinutes: number
  caloriesBurned: number
  exercises: Exercise[]
}

type FormState = {
  title: string
  date: string
  notes: string
  durationMinutes: string
  caloriesBurned: string
  exerciseName: string
  sets: string
  reps: string
  weightKg: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://daily-tracker-backend-1a0l.onrender.com'
const STORAGE_KEY = 'pulseboard-auth'
const today = new Date().toISOString().slice(0, 10)

const emptyForm: FormState = {
  title: '',
  date: today,
  notes: '',
  durationMinutes: '45',
  caloriesBurned: '300',
  exerciseName: '',
  sets: '3',
  reps: '10',
  weightKg: '',
}

function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [view, setView] = useState<View>('overview')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (auth) void loadWorkouts(auth)
  }, [auth])

  if (!auth) {
    return <AuthScreen onAuthenticated={setAuth} />
  }

  const stats = getStats(workouts)

  async function loadWorkouts(currentAuth = auth) {
    if (!currentAuth) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/tenants/${currentAuth.tenantId}/workouts`, {
        headers: { Authorization: `Bearer ${currentAuth.token}` },
      })
      if (!response.ok) throw new Error(await readError(response))
      setWorkouts(await response.json())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load workouts.')
    } finally {
      setLoading(false)
    }
  }

  async function createWorkout(payload: FormState) {
    if (!auth) throw new Error('Your session has expired. Please sign in again.')
    setError('')
    const response = await fetch(`${API_BASE}/api/tenants/${auth.tenantId}/workouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: payload.date,
        title: payload.title,
        notes: payload.notes || null,
        durationMinutes: Number(payload.durationMinutes) || 0,
        caloriesBurned: Number(payload.caloriesBurned) || 0,
        exercises: payload.exerciseName
          ? [{
              name: payload.exerciseName,
              sets: Number(payload.sets) || 0,
              reps: Number(payload.reps) || 0,
              weightKg: payload.weightKg ? Number(payload.weightKg) : null,
            }]
          : [],
      }),
    })
    if (!response.ok) throw new Error(await readError(response))
    const created: Workout = await response.json()
    setWorkouts((current) => [created, ...current])
    setShowComposer(false)
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>p</span></div>
        <div className="brand-copy">
          <strong>pulseboard</strong>
          <span>daily training log</span>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setView('overview')}>
            <Sparkles size={17} /> Overview
          </button>
          <button className={view === 'workouts' ? 'nav-item active' : 'nav-item'} onClick={() => setView('workouts')}>
            <Dumbbell size={17} /> Workouts
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="tenant-chip">
            <div className="avatar">{auth.email[0].toUpperCase()}</div>
            <div><strong>{auth.email.split('@')[0]}</strong><span>{auth.role.toLowerCase()}</span></div>
            <ChevronDown size={15} />
          </div>
          <button className="signout" onClick={signOut}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">{formatLongDate(new Date())}</span>
            <h1>{view === 'overview' ? 'Your training, in focus.' : 'Workout library'}</h1>
          </div>
          <button className="primary-button" onClick={() => setShowComposer(true)}><Plus size={18} /> Log workout</button>
        </header>

        {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}

        {view === 'overview' ? (
          <>
            <section className="hero-strip">
              <div>
                <span className="section-kicker">KEEP THE STREAK ALIVE</span>
                <h2>Small sessions.<br /><em>Strong signal.</em></h2>
                <p>Every workout is a note to your future self.</p>
              </div>
              <div className="hero-figure"><Dumbbell size={74} strokeWidth={1.2} /><span>01</span></div>
            </section>
            <section className="stats-grid">
              <StatCard label="Sessions logged" value={String(stats.sessions)} detail="all time" icon={<Dumbbell size={18} />} accent="coral" />
              <StatCard label="Minutes moving" value={String(stats.minutes)} detail="total duration" icon={<Timer size={18} />} accent="yellow" />
              <StatCard label="Calories burned" value={stats.calories.toLocaleString()} detail="tracked output" icon={<Flame size={18} />} accent="blue" />
              <StatCard label="Current rhythm" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} detail="recent activity" icon={<CalendarDays size={18} />} accent="green" />
            </section>
            <section className="content-section">
              <div className="section-heading"><div><span className="section-kicker">RECENT NOTES</span><h2>Latest workouts</h2></div><button className="text-button" onClick={() => setView('workouts')}>View all <ArrowUpRight size={16} /></button></div>
              {loading ? <LoadingState /> : workouts.length === 0 ? <EmptyState onAdd={() => setShowComposer(true)} /> : <WorkoutList workouts={workouts.slice(0, 4)} />}
            </section>
          </>
        ) : (
          <section className="content-section library-section">
            <div className="section-heading"><div><span className="section-kicker">YOUR ARCHIVE</span><h2>Every rep counts.</h2></div><span className="result-count">{workouts.length} entries</span></div>
            {loading ? <LoadingState /> : workouts.length === 0 ? <EmptyState onAdd={() => setShowComposer(true)} /> : <WorkoutList workouts={workouts} />}
          </section>
        )}
      </main>
      {showComposer && <WorkoutComposer onClose={() => setShowComposer(false)} onSubmit={createWorkout} />}
    </div>
  )
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (auth: AuthResponse) => void }) {
  const [mode, setMode] = useState<AuthMode>('register')
  const [form, setForm] = useState({ tenantName: '', tenantSlug: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const endpoint = mode === 'register' ? '/api/auth/register-tenant' : '/api/auth/login'
    const body = mode === 'register'
      ? form
      : { email: form.email, password: form.password }
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await readError(response))
      const result: AuthResponse = await response.json()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      onAuthenticated(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div className="art-brand"><div className="brand-mark"><span>p</span></div><strong>pulseboard</strong></div>
        <div className="art-copy"><span className="section-kicker">A CLEARER WAY TO TRAIN</span><h1>Make the work<br /><em>visible.</em></h1><p>One calm place for your sessions, your rhythm, and the proof that you showed up.</p></div>
        <div className="art-stamp"><ShieldCheck size={18} /><span>private by design<br /><b>tenant-isolated</b></span></div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="mobile-brand"><div className="brand-mark"><span>p</span></div><strong>pulseboard</strong></div>
          <div className="auth-heading"><span className="section-kicker">{mode === 'register' ? 'START YOUR SPACE' : 'WELCOME BACK'}</span><h2>{mode === 'register' ? 'Build your base.' : 'Pick up where you left off.'}</h2><p>{mode === 'register' ? 'Create a private home for your training log.' : 'Your next session is already waiting.'}</p></div>
          <div className="auth-tabs"><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>New account</button><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button></div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <><label>Workspace name<input required value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} placeholder="Atlas Training Club" /></label><label>Workspace handle<input value={form.tenantSlug} onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} placeholder="atlas-training" /></label></>}
            <label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
            <label>Password<input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ characters" /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="submit-button" disabled={loading}>{loading ? 'Opening your space…' : mode === 'register' ? 'Create workspace' : 'Enter pulseboard'} <ArrowUpRight size={17} /></button>
          </form>
          <p className="auth-footnote"><ShieldCheck size={14} /> Your data stays scoped to your workspace.</p>
        </div>
      </div>
    </div>
  )
}

function WorkoutComposer({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: FormState) => Promise<void> }) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try { await onSubmit(form) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not save workout.') } finally { setSaving(false) }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="composer" role="dialog" aria-modal="true"><div className="composer-header"><div><span className="section-kicker">NEW ENTRY</span><h2>Log a workout</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div><form onSubmit={submit}><div className="form-grid"><label className="wide">Session title<input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Upper body strength" /></label><label>Date<input required type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></label><label>Duration (min)<input type="number" min="0" value={form.durationMinutes} onChange={(e) => update('durationMinutes', e.target.value)} /></label><label>Calories<input type="number" min="0" value={form.caloriesBurned} onChange={(e) => update('caloriesBurned', e.target.value)} /></label><label className="wide">Notes<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="How did it feel?" rows={3} /></label></div><div className="exercise-block"><div className="exercise-heading"><span className="section-kicker">OPTIONAL DETAIL</span><strong>First exercise</strong></div><div className="form-grid"><label className="wide">Exercise name<input value={form.exerciseName} onChange={(e) => update('exerciseName', e.target.value)} placeholder="Bench press" /></label><label>Sets<input type="number" min="0" value={form.sets} onChange={(e) => update('sets', e.target.value)} /></label><label>Reps<input type="number" min="0" value={form.reps} onChange={(e) => update('reps', e.target.value)} /></label><label>Weight (kg)<input type="number" min="0" step="0.5" value={form.weightKg} onChange={(e) => update('weightKg', e.target.value)} placeholder="Optional" /></label></div></div>{error && <div className="form-error">{error}</div>}<div className="composer-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="submit-button compact" disabled={saving}>{saving ? 'Saving…' : 'Save workout'} <Check size={17} /></button></div></form></section></div>
}

function WorkoutList({ workouts }: { workouts: Workout[] }) {
  return <div className="workout-list">{workouts.map((workout) => <article className="workout-row" key={workout.id}><div className="date-tile"><strong>{new Date(`${workout.date}T12:00:00`).getDate()}</strong><span>{new Date(`${workout.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })}</span></div><div className="workout-main"><div className="workout-title"><h3>{workout.title}</h3><span>{workout.notes || 'No notes added'}</span></div><div className="workout-meta"><span><Timer size={14} /> {workout.durationMinutes} min</span><span><Flame size={14} /> {workout.caloriesBurned} kcal</span><span><Dumbbell size={14} /> {workout.exercises?.length || 0} exercises</span></div></div><ArrowUpRight className="row-arrow" size={19} /></article>)}</div>
}

function StatCard({ label, value, detail, icon, accent }: { label: string; value: string; detail: string; icon: ReactNode; accent: string }) {
  return <div className={`stat-card ${accent}`}><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Dumbbell size={25} /></div><h3>Your log is a blank page.</h3><p>Make the first mark with a workout from today.</p><button className="secondary-button" onClick={onAdd}><Plus size={16} /> Add first workout</button></div>
}

function LoadingState() { return <div className="loading-state"><div className="loader" />Loading your training log…</div> }

function getStats(workouts: Workout[]) {
  const minutes = workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0)
  const calories = workouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0)
  const dates = new Set(workouts.map((workout) => workout.date))
  let streak = 0
  const cursor = new Date()
  while (dates.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  return { sessions: workouts.length, minutes, calories, streak }
}

function formatLongDate(date: Date) { return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }
async function readError(response: Response) { const text = await response.text(); return text || `Request failed (${response.status})` }

export default App
