import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BellRing, CheckCircle2, Clock3, GraduationCap, LogOut, MapPin, Phone, Search, ShoppingBag, Store, XCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function Brand({ small = false }) {
  return <div className="brand"><div className="brand-mark"><ShoppingBag size={small ? 19 : 24} /></div><div><div className="brand-name">CampusKart</div><div className="brand-tag">Your campus. Your shops.</div></div></div>
}

function StatusPill({ shop }) {
  if (shop.is_stale || shop.status === 'UNKNOWN') return <span className="pill pill-unknown"><BellRing size={13}/> Not updated</span>
  return shop.status === 'OPEN'
    ? <span className="pill pill-open"><CheckCircle2 size={13}/> Open</span>
    : <span className="pill pill-closed"><XCircle size={13}/> Closed</span>
}

function RoleScreen({ onChoose }) {
  return <main className="auth-shell"><section className="auth-card"><div className="auth-top"><Brand/><div className="eyebrow">CAMPUS SHOP DIRECTORY</div><h1>Know before<br/><span>you go.</span></h1><p className="muted intro">Check which campus shops are open before you leave your hostel.</p></div><div className="role-list"><button className="role-card" onClick={() => onChoose('student')}><div className="role-icon student-icon"><GraduationCap size={25}/></div><div className="role-copy"><strong>Continue as Student</strong><span>Find open shops around campus</span></div><ArrowRight className="role-arrow" size={19}/></button><button className="role-card" onClick={() => onChoose('owner')}><div className="role-icon owner-icon"><Store size={24}/></div><div className="role-copy"><strong>Continue as Shop Owner</strong><span>Update your shop's availability</span></div><ArrowRight className="role-arrow" size={19}/></button></div><div className="auth-foot">Simple updates from campus shop owners.</div></section><div className="auth-side"><div className="side-orb orb-one"/><div className="side-orb orb-two"/><div className="side-content"><div className="side-chip"><span className="live-dot"/> CAMPUS AVAILABILITY</div><h2>Less walking.<br/>More knowing.</h2><p>One simple place to see shop updates shared by the people who run them.</p><div className="side-mini"><div className="mini-shop"><span className="mini-icon"><Store size={17}/></span><span><b>Food Corner</b><small>Updated just now</small></span><em>OPEN</em></div><div className="mini-shop"><span className="mini-icon"><Store size={17}/></span><span><b>Campus Bakery</b><small>Updated 8 min ago</small></span><em className="mini-closed">CLOSED</em></div></div></div></div></main>
}

function OwnerLogin({ onBack, onLogin }) {
  const [username, setUsername] = useState('foodowner')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { const res = await fetch(`${API}/api/owner/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username,password}) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Login failed'); onLogin(data) } catch (err) { setError(err.message === 'Failed to fetch' ? 'Cannot reach the backend. Start FastAPI on port 8000.' : err.message) } finally { setBusy(false) } }
  return <main className="center-shell"><section className="login-card"><button className="back-btn" onClick={onBack}><ArrowLeft size={17}/> Back</button><Brand/><div className="eyebrow">SHOP OWNER ACCESS</div><h1>Welcome back.</h1><p className="muted">Sign in to update your shop status.</p><form onSubmit={submit} className="login-form"><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error && <div className="error-box">{error}</div>}<button className="primary-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in as shop owner'}<ArrowRight size={17}/></button></form><div className="demo-hint"><b>Local demo account</b><span>foodowner / demo123</span><span>Other demo accounts are listed in README.</span></div></section></main>
}

function StudentDashboard({ onHome }) {
  const [shops, setShops] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() { try { const res = await fetch(`${API}/api/shops`); if (!res.ok) throw new Error('Could not load shops'); setShops(await res.json()); setError('') } catch { setError('Could not connect to CampusKart API. Start the backend to load shop data.') } finally { setLoading(false) } }
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer) }, [])
  const filtered = useMemo(() => shops.filter(s => (filter === 'ALL' || (filter === 'UNKNOWN' ? s.is_stale : s.status === filter)) && `${s.name} ${s.category}`.toLowerCase().includes(query.toLowerCase())), [shops, filter, query])
  const openCount = shops.filter(s=>s.status==='OPEN'&&!s.is_stale).length
  return <main className="dashboard"><header className="topbar"><Brand small/><div className="top-actions"><span className="student-label"><GraduationCap size={16}/> Student view</span><button className="text-btn" onClick={onHome}>Switch role</button></div></header><section className="dash-hero"><div><div className="eyebrow light-eyebrow"><MapPin size={13}/> CAMPUS DIRECTORY</div><h1>Where do you<br/><span>feel like going?</span></h1><p>Check the latest shop updates before heading out.</p></div><div className="hero-stat"><b>{openCount}</b><span>shops open<br/>right now*</span></div></section><section className="dash-content"><div className="section-heading"><div><h2>Campus shops</h2><p className="muted">Status refreshes automatically every 30 seconds.</p></div><span className="sample-note">*Based on latest owner updates</span></div><div className="toolbar"><div className="search-box"><Search size={18}/><input placeholder="Search shops or categories…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="filter-row">{['ALL','OPEN','CLOSED','UNKNOWN'].map(f=><button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{f==='UNKNOWN'?'Not updated':f[0]+f.slice(1).toLowerCase()}</button>)}</div></div>{error && <div className="error-box">{error}</div>}{loading ? <div className="empty-state">Loading campus shops…</div> : <div className="shop-grid">{filtered.map(shop=><article className="shop-card" key={shop.id}><div className="shop-card-top"><div className="shop-avatar"><Store size={21}/></div><StatusPill shop={shop}/></div><h3>{shop.name}</h3><p className="category">{shop.category}</p><div className="shop-meta"><span><Clock3 size={14}/>{shop.is_stale ? `Last update ${shop.age_minutes} min ago` : `Updated ${shop.age_minutes === 0 ? 'just now' : `${shop.age_minutes} min ago`}`}</span></div><a className="call-link" href={`tel:${shop.phone}`}><Phone size={15}/> Call shop owner</a></article>)}</div>}{!loading && filtered.length===0 && <div className="empty-state">No shops match your search.</div>}<p className="freshness-note"><BellRing size={14}/> A status older than 30 minutes is marked “Not updated”. Please call the owner to confirm.</p></section><footer className="footer">CampusKart · Know before you go.</footer></main>
}

function OwnerDashboard({ session, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const headers = { Authorization: `Bearer ${session.access_token}` }
  async function load() { try { const res = await fetch(`${API}/api/owner/me`, {headers}); if (!res.ok) throw new Error('Session expired. Please sign in again.'); const data = await res.json(); setProfile(data) } catch(e) { setError(e.message) } }
  useEffect(() => { load() }, [])
  async function update(status) { setBusy(true); setMessage(''); setError(''); try { const res = await fetch(`${API}/api/owner/status`, {method:'PUT', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({status})}); const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Update failed'); setMessage(`Your shop is now marked ${status.toLowerCase()}.`); await load() } catch(e) { setError(e.message) } finally { setBusy(false) } }
  return <main className="dashboard owner-dashboard"><header className="topbar"><Brand small/><div className="top-actions"><span className="student-label"><Store size={16}/> Owner view</span><button className="text-btn" onClick={onLogout}><LogOut size={15}/> Sign out</button></div></header><section className="owner-wrap"><div className="eyebrow">SHOP OWNER DASHBOARD</div><h1>Keep your shop<br/><span>status up to date.</span></h1><p className="muted">A quick tap helps students avoid an unnecessary walk.</p>{profile ? <section className="owner-panel"><div className="owner-shop-head"><div className="shop-avatar large"><Store size={25}/></div><div><h2>{profile.shop.name}</h2><p className="muted">{profile.shop.category}</p></div></div><div className="current-status"><span className="muted">Current saved status</span><strong className={profile.shop.status==='OPEN'?'status-open-text':'status-closed-text'}>{profile.shop.status}</strong><small>Last updated: {new Date(profile.shop.updated_at).toLocaleString()}</small></div><div className="update-prompt">What is your shop's status right now?</div><div className="status-actions"><button disabled={busy} className="set-open" onClick={()=>update('OPEN')}><CheckCircle2 size={21}/> Mark as OPEN</button><button disabled={busy} className="set-closed" onClick={()=>update('CLOSED')}><XCircle size={21}/> Mark as CLOSED</button></div><p className="owner-note">Remember to update your status whenever you open or close the shop.</p>{message && <div className="success-box">{message}</div>}{error && <div className="error-box">{error}</div>}</section> : <div className="empty-state">{error || 'Loading your shop…'}</div>}</section><footer className="footer">CampusKart · Thank you for keeping students informed.</footer></main>
}

export default function App() {
  const [screen, setScreen] = useState('roles')
  const [session, setSession] = useState(null)
  function logout() { setSession(null); setScreen('roles') }
  if (screen === 'owner-login') return <OwnerLogin onBack={()=>setScreen('roles')} onLogin={data=>{setSession(data);setScreen('owner')}}/>
  if (screen === 'student') return <StudentDashboard onHome={()=>setScreen('roles')}/>
  if (screen === 'owner' && session) return <OwnerDashboard session={session} onLogout={logout}/>
  return <RoleScreen onChoose={role=>setScreen(role==='student'?'student':'owner-login')}/>
}
