'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Store, Package, AlertTriangle, Award, XCircle, Search, Download, Filter, ChevronRight, ArrowUp, ArrowDown, Minus, Menu, X, Home, Bell, LogOut, User, Check, FileText, ChevronDown, Settings, HelpCircle, MapPin, ChevronLeft, AlertCircle } from 'lucide-react';
import STORES_RAW from './stores.json';
import PRODUCTS_RAW from './products.json';
import FILTERS from './filters.json';
import STORE_PRODUCTS from './store_products.json';
import PRODUCT_STORES from './product_stores.json';

// Calculate LONG TERM status (based on yearly, 6m, 3m)
const calcLongTermStatus = (item, config) => {
  const longTerm = item.metric_long_term || item.metric_12v12 || 0;
  if (longTerm >= config.long_growth) return 'צמיחה';
  if (longTerm >= config.long_stable_min && longTerm <= config.long_stable_max) return 'יציב';
  if (longTerm >= config.long_decline) return 'ירידה';
  return 'קריטי';
};

// Calculate SHORT TERM status (based on 2 months only - alert system)
const calcShortTermStatus = (item, config) => {
  const shortTerm = item.metric_2v2 || item.metric_short_term || 0;
  if (shortTerm >= config.short_surge) return 'עלייה חדה';
  if (shortTerm >= config.short_stable_min) return 'יציב';
  if (shortTerm >= config.short_decline) return 'ירידה';
  return 'אזעקה';
};

const applyConfig = (items, config) => items.map(item => ({
  ...item,
  status_long: calcLongTermStatus(item, config),
  status_short: calcShortTermStatus(item, config),
  // Keep old status for backward compatibility
  status: calcLongTermStatus(item, config),
  is_recovering: (item.metric_long_term || item.metric_12v12 || 0) < 0 && (item.metric_2v2 || item.metric_short_term || 0) >= config.short_surge
}));

// Long term status config
const STATUS_LONG_CFG = {
  'צמיחה': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', Icon: TrendingUp },
  'יציב': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', Icon: Minus },
  'ירידה': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', Icon: TrendingDown },
  'קריטי': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', Icon: AlertTriangle },
};

// Short term status config (alerts)
const STATUS_SHORT_CFG = {
  'עלייה חדה': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', Icon: TrendingUp, emoji: '🚀' },
  'יציב': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', Icon: Minus, emoji: '✅' },
  'ירידה': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', Icon: TrendingDown, emoji: '⚠️' },
  'אזעקה': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', Icon: AlertCircle, emoji: '🚨' },
};

// Keep old config for backwards compatibility
const STATUS_CFG = STATUS_LONG_CFG;

const Tip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex mr-1">
      <HelpCircle size={14} className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} />
      {show && <div className="fixed z-[9999] transform -translate-y-full -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl whitespace-normal text-right" style={{ marginTop: '-8px' }}>{text}</div>}
    </div>
  );
};

const METRIC_TIPS = {
  '12v12': 'השוואת סך הכמות בכל 2024 מול כל 2025',
  '6v6': 'השוואת ינו-יונ 2025 מול יול-דצמ 2025',
  '3v3': 'השוואת אוק-דצמ 2024 מול אוק-דצמ 2025',
  '2v2': 'השוואת ספט-אוק מול נוב-דצמ 2025',
  'peak': 'מרחק מהשיא = דצמבר 2025 מול ממוצע 4 החודשים הגבוהים',
  'returns': 'אחוז החזרות מהאספקה',
  'long_term': 'מדד טווח ארוך = הנמוך מבין: 12v12, 6v6, 3v3',
  'short_term': 'מדד טווח קצר = 2v2 (נוב-דצמ מול ספט-אוק)',
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// Helper to get short-term status (for filters)
const getShortTermStatus = (item) => {
  return item.status_short || 'יציב';
};

// Helper to get long-term status (for filters)
const getLongTermStatus = (item) => {
  return item.status_long || 'יציב';
};

// Auth helpers
const DEFAULT_PASSWORD = 'baron148';
const getPassword = () => { if (typeof window === 'undefined') return DEFAULT_PASSWORD; return localStorage.getItem('baron_password') || DEFAULT_PASSWORD; };
const setPassword = (pwd) => { if (typeof window !== 'undefined') localStorage.setItem('baron_password', pwd); };
const isLoggedIn = () => { if (typeof window === 'undefined') return false; return localStorage.getItem('baron_logged_in') === 'true'; };
const setLoggedIn = (val) => { if (typeof window !== 'undefined') localStorage.setItem('baron_logged_in', val ? 'true' : 'false'); };

// Exclusions helpers
const getExclusions = () => { if (typeof window === 'undefined') return { stores: [], products: [] }; try { return JSON.parse(localStorage.getItem('baron_exclusions') || '{"stores":[],"products":[]}'); } catch { return { stores: [], products: [] }; } };
const setExclusions = (exc) => { if (typeof window !== 'undefined') localStorage.setItem('baron_exclusions', JSON.stringify(exc)); };

// Login Screen Component
const LoginScreen = ({ onLogin }) => {
  const [password, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  
  const handleLogin = () => {
    if (password === getPassword()) {
      setLoggedIn(true);
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/baron-logo.png" alt="ברון" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">ברוכים הבאים</h1>
          <p className="text-gray-500 mt-2">מערכת ניתוח מכירות</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש</label>
            <input type="text" value="מנהל" disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמא</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPasswordInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
              placeholder="הזן סיסמא"
              className={'w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' + (error ? 'border-red-500 bg-red-50' : 'border-gray-200')}
            />
            {error && <p className="text-red-500 text-sm mt-1">סיסמא שגויה</p>}
          </div>
          <button onClick={handleLogin} className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg">
            כניסה למערכת
          </button>
        </div>
      </div>
    </div>
  );
};
const fmt = n => n != null ? new Intl.NumberFormat('he-IL').format(Math.round(n)) : '-';
const fmtPct = n => n != null ? (n > 0 ? '+' : '') + n.toFixed(1) + '%' : '-';
const fmtMonth = m => { const s = String(m); return s.slice(4) + '/' + s.slice(2,4); };
const fmtMonthHeb = m => { if (!m) return '-'; const ms = ['','ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ']; const s = String(m); return ms[parseInt(s.slice(4))] + ' ' + s.slice(0,4); };

const Badge = ({ status, sm }) => { const c = STATUS_LONG_CFG[status] || STATUS_LONG_CFG['יציב']; return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${sm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}><c.Icon size={sm ? 12 : 14} />{status}</span>; };

// Long Term Status Badge
const LongTermBadge = ({ status, sm }) => {
  const c = STATUS_LONG_CFG[status] || STATUS_LONG_CFG['יציב'];
  return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} border ${c.border} ${sm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}><c.Icon size={12} />{status}</span>;
};

// Short Term Status Badge (with emoji for alerts)
const ShortTermBadge = ({ status, sm }) => {
  const c = STATUS_SHORT_CFG[status] || STATUS_SHORT_CFG['יציב'];
  return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} border ${c.border} ${sm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}>{c.emoji} {status}</span>;
};

const StatusBadge = ({ item, sm }) => {
  const longStatus = item?.status_long || 'יציב';
  const shortStatus = item?.status_short || 'יציב';
  return (
    <div className="flex flex-col gap-1">
      <LongTermBadge status={longStatus} sm={sm} />
      <ShortTermBadge status={shortStatus} sm={sm} />
    </div>
  );
};

const LongTermCell = ({ value }) => {
  const color = value >= 10 ? 'text-emerald-600' : value >= 0 ? 'text-emerald-500' : value >= -10 ? 'text-orange-500' : 'text-red-600';
  const bg = value >= 10 ? 'bg-emerald-50' : value >= 0 ? 'bg-emerald-50' : value >= -10 ? 'bg-orange-50' : 'bg-red-50';
  return <div className={`text-center px-2 py-1 rounded-lg ${bg}`}><span className={`font-bold ${color}`}>{fmtPct(value)}</span></div>;
};

const ShortTermCell = ({ value, ok }) => {
  const isPositive = value >= 0 || ok;
  return <div className={`text-center px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}><span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(value)}</span></div>;
};

const Card = ({ title, value, sub, trend, icon: Icon, color = 'blue' }) => {
  const cols = { blue: 'from-blue-500 to-blue-600', green: 'from-emerald-500 to-emerald-600', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600' };
  return (<div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
    <div className="flex items-start justify-between">
      <div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>{sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}</div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${cols[color]} shadow-lg`}><Icon className="text-white" size={20} /></div>
    </div>
    {trend !== undefined && <div className={`mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{trend >= 0 ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}<span className="text-sm font-semibold">{fmtPct(trend)}</span></div>}
  </div>);
};

const MBox = ({ label, value, sub, pos, extra }) => {
  const isPos = pos !== undefined ? pos : (typeof value === 'number' ? value >= 0 : true);
  return (<div className="bg-white rounded-xl shadow p-3 text-center border border-gray-100">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-lg font-bold ${typeof value === 'number' ? (isPos ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}`}>{typeof value === 'number' ? fmtPct(value) : value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    {extra && <p className="text-xs text-gray-500 mt-1 border-t pt-1">{extra}</p>}
  </div>);
};

const MultiSelect = ({ label, opts, selected, onChange, placeholder = 'הכל' }) => {
  const [open, setOpen] = useState(false);
  const toggle = val => selected.includes(val) ? onChange(selected.filter(v => v !== val)) : onChange([...selected, val]);
  return (
    <div className="relative">
      {label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
      <button onClick={() => setOpen(!open)} className="w-full min-w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white flex justify-between items-center gap-2">
        <span className="truncate">{selected.length ? selected.length + ' נבחרו' : placeholder}</span>
        <ChevronDown size={16} className={'transition-transform flex-shrink-0 ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && <div className="absolute z-50 mt-1 w-64 bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
        <button onClick={() => onChange([])} className="w-full px-3 py-2 text-right text-sm hover:bg-gray-50 border-b font-medium">נקה הכל</button>
        {opts.map(o => <label key={o} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="rounded" /><span className="text-sm truncate">{o}</span></label>)}
      </div>}
    </div>
  );
};

const MetricCell = ({ pct, from, to }) => (<div className="text-center"><span className={`font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(pct)}</span><p className="text-xs text-gray-400">{fmt(from)}→{fmt(to)}</p></div>);
const ReturnsCell = ({ pctL6, pctP6, change }) => (<div className="text-center"><span className="text-sm">{(pctP6 || 0).toFixed(1)}%→{(pctL6 || 0).toFixed(1)}%</span><p className={`text-xs font-bold ${change > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{change > 0 ? '+' : ''}{(change || 0).toFixed(1)}%</p></div>);
const PeakCell = ({ pct, peak, current }) => (<div className="text-center"><span className={`font-bold ${pct >= -20 ? 'text-emerald-600' : pct >= -40 ? 'text-orange-500' : 'text-red-600'}`}>{fmtPct(pct)}</span><p className="text-xs text-gray-400">שיא(4): {fmt(peak)} | דצמ: {fmt(current)}</p></div>);

const exportPDF = title => { document.title = title; window.print(); };
const exportCSV = (data, columns, filename) => {
  const header = columns.map(c => c.l.replace(/\n/g, ' ')).join(',');
  const rows = data.map(r => columns.map(c => { const val = r[c.k]; return typeof val === 'string' && val.includes(',') ? '"' + val + '"' : (val ?? ''); }).join(','));
  const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click();
};

// Table with sticky first column, 100 rows, and improved horizontal scroll
const Table = ({ data, cols, onRow, name = 'data', compact = false }) => {
  const [sort, setSort] = useState({ k: null, d: 'desc' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const scrollRef = React.useRef(null);
  const perPage = 100;
  const filtered = useMemo(() => {
    let r = data.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search.toLowerCase())));
    if (sort.k) r.sort((a, b) => { const av = a[sort.k], bv = b[sort.k]; return av < bv ? (sort.d === 'asc' ? -1 : 1) : av > bv ? (sort.d === 'asc' ? 1 : -1) : 0; });
    return r;
  }, [data, sort, search]);
  const pages = Math.ceil(filtered.length / perPage);
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  
  const scrollLeft = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' }); };
  const scrollRight = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' }); };
  
  return (<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
    <div className="p-3 border-b flex flex-wrap gap-2 items-center justify-between print:hidden">
      <div className="relative flex-1 min-w-48"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="חיפוש..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm" /></div>
      <button onClick={() => exportCSV(filtered, cols, name)} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm"><Download size={16}/>Excel</button>
    </div>
    {/* Scroll arrows for mobile - outside the scroll container */}
    <div className="relative">
      <button onClick={scrollLeft} className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-30 bg-blue-500 shadow-lg rounded-full p-2 hover:bg-blue-600">
        <ChevronRight size={24} className="text-white" />
      </button>
      <button onClick={scrollRight} className="lg:hidden absolute left-1 top-1/2 -translate-y-1/2 z-30 bg-blue-500 shadow-lg rounded-full p-2 hover:bg-blue-600">
        <ChevronLeft size={24} className="text-white" />
      </button>
      <div ref={scrollRef} className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full min-w-max">
          <thead className="bg-gray-50">
            <tr>{cols.map((c, idx) => <th key={c.k} onClick={() => setSort(p => ({ k: c.k, d: p.k === c.k && p.d === 'desc' ? 'asc' : 'desc' }))} className={`px-3 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-pre-line ${idx === 0 ? 'sticky right-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}><span className="flex items-center gap-1">{c.t && <Tip text={c.t} />}{c.l}{sort.k === c.k && <span className="text-blue-500 mr-1">{sort.d === 'asc' ? '↑' : '↓'}</span>}</span></th>)}</tr>
          </thead>
          <tbody className="divide-y">{rows.map((r, i) => <tr key={r.id || i} onClick={() => onRow && onRow(r)} className={'hover:bg-blue-50 ' + (onRow ? 'cursor-pointer' : '')}>{cols.map((c, idx) => <td key={c.k} className={`px-3 text-sm whitespace-nowrap ${compact ? 'py-2' : 'py-3'} ${idx === 0 ? 'sticky right-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}>{c.r ? c.r(r[c.k], r) : r[c.k]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-sm print:hidden">
      <span>{filtered.length} רשומות</span>
      <div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">הקודם</button><span>{page}/{pages || 1}</span><button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="px-3 py-1 border rounded disabled:opacity-50">הבא</button></div>
    </div>
  </div>)
};

const Overview = ({ stores, products, onNav }) => {
  const st = useMemo(() => {
    const active = stores.filter(s => !s.is_inactive);
    const q24 = stores.reduce((s, x) => s + (x.qty_2024 || 0), 0);
    const q25 = stores.reduce((s, x) => s + (x.qty_2025 || 0), 0);
    const ql6 = stores.reduce((s, x) => s + (x.qty_last6 || 0), 0);
    const qp6 = stores.reduce((s, x) => s + (x.qty_prev6 || 0), 0);
    const s24 = stores.reduce((s, x) => s + (x.sales_2024 || 0), 0);
    const s25 = stores.reduce((s, x) => s + (x.sales_2025 || 0), 0);
    const sl6 = stores.reduce((s, x) => s + (x.sales_last6 || 0), 0);
    const sp6 = stores.reduce((s, x) => s + (x.sales_prev6 || 0), 0);
    const yoy_qty = q24 > 0 ? ((q25 - q24) / q24) * 100 : 0;
    const yoy_sales = s24 > 0 ? ((s25 - s24) / s24) * 100 : 0;
    const hoh_qty = qp6 > 0 ? ((ql6 - qp6) / qp6) * 100 : 0;
    const hoh_sales = sp6 > 0 ? ((sl6 - sp6) / sp6) * 100 : 0;
    const sc = {}; stores.forEach(s => { sc[s.status] = (sc[s.status] || 0) + 1; });
    const top = [...stores].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0)).slice(0, 20);
    const bot = [...active].sort((a, b) => (a.metric_12v12 || 0) - (b.metric_12v12 || 0)).slice(0, 20);
    const alerts = stores.filter(s => !s.is_inactive && (s.status === 'התרסקות' || s.declining_months >= 3)).length;
    return { active: active.length, total: stores.length, q24, q25, ql6, qp6, s24, s25, sl6, sp6, yoy_qty, yoy_sales, hoh_qty, hoh_sales, sc, top, bot, alerts };
  }, [stores]);
  const pie = Object.entries(st.sc).map(([n, v], i) => ({ name: n, value: v, color: COLORS[i % COLORS.length] }));
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); }); return Object.entries(m).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">סקירה כללית</h2><button onClick={() => exportPDF('סקירה כללית - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="סה״כ חנויות" value={fmt(st.total)} sub={st.active + ' פעילות'} icon={Store} color="blue" />
      <Card title="סה״כ כמות (2024-2025)" value={fmt(st.q24 + st.q25)} trend={st.yoy_qty} icon={TrendingUp} color="green" />
      <Card title="מוצרים פעילים" value={products.filter(p => !p.is_inactive).length} sub={'מתוך ' + products.length} icon={Package} color="purple" />
      <Card title="התראות" value={st.alerts} sub="דורשות טיפול" icon={AlertTriangle} color="red" />
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">השוואה שנתית: 2024 ↔ 2025</h3>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">כמות 2024</p><p className="text-xl font-bold text-blue-600">{fmt(st.q24)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">כמות 2025</p><p className="text-xl font-bold text-emerald-600">{fmt(st.q25)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.yoy_qty >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.yoy_qty >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.yoy_qty)}</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">מחזור 2024</p><p className="text-xl font-bold text-blue-600">₪{fmt(st.s24)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">מחזור 2025</p><p className="text-xl font-bold text-emerald-600">₪{fmt(st.s25)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.yoy_sales >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.yoy_sales >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.yoy_sales)}</p></div>
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">השוואה חצי שנתית: H1 ↔ H2 2025</h3>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">כמות H1</p><p className="text-xl font-bold text-blue-600">{fmt(st.qp6)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">כמות H2</p><p className="text-xl font-bold text-emerald-600">{fmt(st.ql6)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.hoh_qty >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.hoh_qty >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.hoh_qty)}</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">מחזור H1</p><p className="text-xl font-bold text-blue-600">₪{fmt(st.sp6)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">מחזור H2</p><p className="text-xl font-bold text-emerald-600">₪{fmt(st.sl6)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.hoh_sales >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.hoh_sales >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.hoh_sales)}</p></div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">התפלגות סטטוסים</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, percent }) => name + ' ' + (percent*100).toFixed(0) + '%'}>{pie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={v => fmt(v)} /></PieChart></ResponsiveContainer></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={trend}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => (v/1000).toFixed(0) + 'K'} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cg)" /></AreaChart></ResponsiveContainer></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">🏆 20 מובילות</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.top.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-sm">{fmt(s.qty_total)}</p></div></div>)}</div></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">📉 20 בירידה</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.bot.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-red-600 text-sm">{fmtPct(s.metric_12v12)}</p><p className="text-xs text-gray-500">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</p></div></div>)}</div></div>
    </div>
  </div>);
};

const StoresList = ({ stores, onSelect }) => {
  const [cities, setCities] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [statusesLong, setStatusesLong] = useState([]);
  const [statusesShort, setStatusesShort] = useState([]);
  const [minQty, setMinQty] = useState(0);
  const [showF, setShowF] = useState(false);
  
  const filtered = useMemo(() => stores.filter(s => {
    if (cities.length && !cities.includes(s.city)) return false;
    if (networks.length && !networks.includes(s.network)) return false;
    if (drivers.length && !drivers.includes(s.driver)) return false;
    if (agents.length && !agents.includes(s.agent)) return false;
    if (statusesLong.length && !statusesLong.includes(s.status_long)) return false;
    if (statusesShort.length && !statusesShort.includes(s.status_short)) return false;
    if (minQty > 0 && (s.qty_2025 || 0) < minQty) return false;
    return true;
  }), [stores, cities, networks, drivers, agents, statusesLong, statusesShort, minQty]);
  
  const cols = [
    { k: 'name', l: 'חנות', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'status_long', l: 'סטטוס', r: (v, r) => <StatusBadge item={r} /> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים\nH1→H2', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים\n24→25', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים\nספט→נוב', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-4 w-full">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-xl font-bold">חנויות ({filtered.length})</h2>
      <div className="flex gap-2 print:hidden">
        <button onClick={() => exportPDF('חנויות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
        <button onClick={() => setShowF(!showF)} className={'flex items-center gap-2 px-4 py-2 rounded-xl ' + (showF ? 'bg-blue-500 text-white' : 'bg-gray-100')}><Filter size={18}/>סינון</button>
      </div>
    </div>
    {showF && <div className="bg-white rounded-xl shadow p-4 print:hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MultiSelect label="עיר" opts={FILTERS.cities || []} selected={cities} onChange={setCities} />
        <MultiSelect label="רשת" opts={FILTERS.networks || []} selected={networks} onChange={setNetworks} />
        <MultiSelect label="נהג" opts={FILTERS.drivers || []} selected={drivers} onChange={setDrivers} />
        <MultiSelect label="סוכן" opts={FILTERS.agents || []} selected={agents} onChange={setAgents} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MultiSelect label="סטטוס טווח ארוך" opts={['צמיחה','יציב','ירידה','קריטי']} selected={statusesLong} onChange={setStatusesLong} />
        <MultiSelect label="סטטוס טווח קצר" opts={['עלייה חדה','יציב','ירידה','אזעקה']} selected={statusesShort} onChange={setStatusesShort} />
        <div><label className="text-xs text-gray-600 block mb-1">מינימום פריטים</label><input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" /></div>
      </div>
    </div>}
    <Table data={filtered} cols={cols} onRow={onSelect} name="stores" />
  </div>);
};

// City Indicator - not shown in PDF
const CityIndicator = ({ store, allStores }) => {
  const cityData = useMemo(() => {
    if (!store.city) return null;
    const cityStores = allStores.filter(s => s.city === store.city && !s.is_inactive);
    if (cityStores.length < 2) return null;
    const statusCounts = {};
    cityStores.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
    
    // Sort for rankings
    const byLongTerm = [...cityStores].sort((a, b) => (b.metric_long_term || 0) - (a.metric_long_term || 0));
    const byShortTerm = [...cityStores].sort((a, b) => (b.metric_short_term || 0) - (a.metric_short_term || 0));
    const byQty = [...cityStores].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0));
    
    // Calculate averages
    const avgLongTerm = cityStores.reduce((s, x) => s + (x.metric_long_term || 0), 0) / cityStores.length;
    const avgShortTerm = cityStores.reduce((s, x) => s + (x.metric_short_term || 0), 0) / cityStores.length;
    const avgQty = cityStores.reduce((s, x) => s + (x.qty_total || 0), 0) / cityStores.length;
    
    // Get ranks
    const longTermRank = byLongTerm.findIndex(s => s.id === store.id) + 1;
    const shortTermRank = byShortTerm.findIndex(s => s.id === store.id) + 1;
    const qtyRank = byQty.findIndex(s => s.id === store.id) + 1;
    
    // Calculate percentiles (how many stores this one beats)
    const longTermPct = Math.round(((cityStores.length - longTermRank) / cityStores.length) * 100);
    const shortTermPct = Math.round(((cityStores.length - shortTermRank) / cityStores.length) * 100);
    const qtyPct = Math.round(((cityStores.length - qtyRank) / cityStores.length) * 100);
    
    return {
      city: store.city,
      total: cityStores.length,
      statusCounts,
      longTermRank, shortTermRank, qtyRank,
      longTermPct, shortTermPct, qtyPct,
      avgLongTerm, avgShortTerm, avgQty,
      storeLongTerm: store.metric_long_term || 0,
      storeShortTerm: store.metric_short_term || 0,
      storeQty: store.qty_total || 0
    };
  }, [store, allStores]);
  
  if (!cityData) return null;
  
  const RankingCard = ({ title, icon, rank, total, value, avg, pct, color, formatValue }) => {
    const isAboveAvg = formatValue === 'pct' ? value >= avg : value >= avg;
    const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
    
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{icon}</span>
          <h4 className="font-bold text-gray-700 text-sm">{title}</h4>
        </div>
        
        <div className="text-center mb-3">
          <span className={`text-3xl font-bold ${color}`}>#{rank}</span>
          <p className="text-xs text-gray-500">מתוך {total} חנויות בעיר</p>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">הערך שלך:</span>
            <span className={`font-bold ${isAboveAvg ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatValue === 'pct' ? fmtPct(value) : fmt(value)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">ממוצע עיר:</span>
            <span className="font-medium text-gray-700">
              {formatValue === 'pct' ? fmtPct(avg) : fmt(avg)}
            </span>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>אחוזון</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {pct >= 50 ? `טוב יותר מ-${pct}% מהחנויות` : `נמוך מ-${100-pct}% מהחנויות`}
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200 print:hidden">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="text-blue-600" size={22} />
        <h3 className="text-lg font-bold text-blue-800">השוואה לחנויות ב{cityData.city}</h3>
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium">{cityData.total} חנויות</span>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(cityData.statusCounts).map(([status, count]) => {
          const cfg = STATUS_CFG[status] || STATUS_CFG['יציב'];
          return <span key={status} className={`${cfg.bg} ${cfg.text} px-2 py-1 rounded-full text-xs font-medium`}>{status}: {count}</span>;
        })}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankingCard 
          title="דירוג טווח ארוך" 
          icon="📈" 
          rank={cityData.longTermRank} 
          total={cityData.total}
          value={cityData.storeLongTerm}
          avg={cityData.avgLongTerm}
          pct={cityData.longTermPct}
          color="text-blue-600"
          formatValue="pct"
        />
        <RankingCard 
          title="דירוג טווח קצר" 
          icon="⚡" 
          rank={cityData.shortTermRank} 
          total={cityData.total}
          value={cityData.storeShortTerm}
          avg={cityData.avgShortTerm}
          pct={cityData.shortTermPct}
          color="text-emerald-600"
          formatValue="pct"
        />
        <RankingCard 
          title="דירוג כמות פריטים" 
          icon="📦" 
          rank={cityData.qtyRank} 
          total={cityData.total}
          value={cityData.storeQty}
          avg={cityData.avgQty}
          pct={cityData.qtyPct}
          color="text-purple-600"
          formatValue="num"
        />
      </div>
    </div>
  );
};

const StoreDetail = ({ store, onBack, allStores }) => {
  const chart = useMemo(() => { if (!store.monthly_qty) return []; return Object.entries(store.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [store]);
  const prods = STORE_PRODUCTS[String(store.id)] || [];
  
  // Pie chart data
  const pieData = useMemo(() => {
    if (!prods.length) return [];
    const sorted = [...prods].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0));
    const top10 = sorted.slice(0, 10);
    const totalQty = prods.reduce((s, p) => s + (p.qty_total || 0), 0);
    return top10.map((p, i) => ({
      name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
      value: p.qty_total || 0,
      pct: totalQty > 0 ? ((p.qty_total || 0) / totalQty * 100).toFixed(1) : 0,
      color: COLORS[i % COLORS.length]
    }));
  }, [prods]);
  
  // Line chart - top 5 products trend
  const top5Products = useMemo(() => [...prods].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0)).slice(0, 5), [prods]);
  const productTrendData = useMemo(() => {
    if (!top5Products.length) return [];
    const months = new Set();
    top5Products.forEach(p => { if (p.monthly_qty) Object.keys(p.monthly_qty).forEach(m => months.add(m)); });
    return [...months].sort((a, b) => Number(a) - Number(b)).map(m => {
      const point = { month: fmtMonth(m) };
      top5Products.forEach((p, i) => { point[`p${i}`] = p.monthly_qty?.[m] || 0; });
      return point;
    });
  }, [top5Products]);
  
  const prodCols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'status', l: 'סטטוס', r: (v, r) => <StatusBadge status={v} recovery={r.is_recovering} shortTerm={r.metric_short_term} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button>
      <button onClick={() => exportPDF(store.name + ' - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">{store.name}</h1><p className="text-gray-500 mt-1">{store.city} {store.network && '• ' + store.network}</p><p className="text-sm text-gray-400 mt-1">נהג: {store.driver || '-'} | סוכן: {store.agent || '-'}</p></div>
        <Badge status={store.status} />
      </div>
    </div>
    <CityIndicator store={store} allStores={allStores} />
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <MBox label="שנתי (24→25)" value={store.metric_12v12} sub={fmt(store.qty_2024) + '→' + fmt(store.qty_2025)} />
      <MBox label="6 חודשים (H1→H2)" value={store.metric_6v6} sub={fmt(store.qty_prev6) + '→' + fmt(store.qty_last6)} />
      <MBox label="3 חודשים (24→25)" value={store.metric_3v3} sub={fmt(store.qty_prev3) + '→' + fmt(store.qty_last3)} />
      <MBox label="2 חודשים (ספט→נוב)" value={store.metric_2v2} sub={fmt(store.qty_prev2) + '→' + fmt(store.qty_last2)} />
      <MBox label="מרחק מהשיא" value={store.metric_peak_distance} extra={'שיא: ' + fmt(store.peak_value) + ' | דצמ: ' + fmt(store.current_value)} />
      <MBox label="חזרות %" value={(store.returns_pct_prev6?.toFixed(1) || 0) + '%→' + (store.returns_pct_last6?.toFixed(1) || 0) + '%'} sub={'שינוי: ' + (store.returns_change > 0 ? '+' : '') + (store.returns_change?.toFixed(1) || 0) + '%'} pos={store.returns_change <= 0} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(store.qty_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(store.qty_2025)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2024</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2025</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2025)}</p></div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#3b82f6" fill="url(#sg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    {pieData.length > 0 && <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">🥧 חלוקת מוצרים (TOP 10)</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ pct }) => `${pct}%`}>{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={(v, n, props) => [fmt(v), props.payload.name]} /></PieChart></ResponsiveContainer>
        <div className="space-y-2">{pieData.map((p, i) => <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div><span className="text-sm">{p.name}</span></div><div className="text-left"><span className="font-bold text-sm">{fmt(p.value)}</span><span className="text-xs text-gray-500 mr-1">({p.pct}%)</span></div></div>)}</div>
      </div>
    </div>}
    {productTrendData.length > 0 && top5Products.length > 0 && <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">📈 מגמת 5 מוצרים מובילים</h3>
      <ResponsiveContainer width="100%" height={300}><LineChart data={productTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={(v, name) => { const idx = parseInt(name.replace('p', '')); return [fmt(v), top5Products[idx]?.name || '']; }} /><Legend formatter={(value) => { const idx = parseInt(value.replace('p', '')); const name = top5Products[idx]?.name || ''; return name.length > 20 ? name.slice(0, 20) + '...' : name; }} />{top5Products.map((_, i) => <Line key={i} type="monotone" dataKey={`p${i}`} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 2 }} name={`p${i}`} />)}</LineChart></ResponsiveContainer>
    </div>}
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מוצרים בחנות ({prods.length})</h3>{prods.length > 0 ? <Table data={prods} cols={prodCols} name={'store_' + store.id + '_products'} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}</div>
  </div>);
};

// Fixed ProductsList with proper filter alignment
const ProductsList = ({ products, onSelect }) => {
  const [cats, setCats] = useState([]);
  const [statusesLong, setStatusesLong] = useState([]);
  const [statusesShort, setStatusesShort] = useState([]);
  const [minQty, setMinQty] = useState(0);
  
  const filtered = useMemo(() => products.filter(p => { 
    if (cats.length && !cats.includes(p.category)) return false; 
    if (statusesLong.length && !statusesLong.includes(p.status_long)) return false;
    if (statusesShort.length && !statusesShort.includes(p.status_short)) return false;
    if (minQty > 0 && (p.qty_2025 || 0) < minQty) return false;
    return true; 
  }), [products, cats, statusesLong, statusesShort, minQty]);
  
  const cols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'status_long', l: 'סטטוס', r: (v, r) => <StatusBadge item={r} /> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'total_sales', l: 'מחזור', r: v => <span className="font-bold text-gray-600">₪{fmt(v)}</span> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-4 w-full">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold">מוצרים ({filtered.length})</h2>
      <button onClick={() => exportPDF('מוצרים - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
    </div>
    <div className="flex flex-wrap gap-3 items-center print:hidden">
      <MultiSelect opts={FILTERS.categories || []} selected={cats} onChange={setCats} placeholder="קטגוריה" />
      <MultiSelect opts={['צמיחה','יציב','ירידה','קריטי']} selected={statusesLong} onChange={setStatusesLong} placeholder="סטטוס ארוך" />
      <MultiSelect opts={['עלייה חדה','יציב','ירידה','אזעקה']} selected={statusesShort} onChange={setStatusesShort} placeholder="סטטוס קצר" />
      <input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="מינ׳ 2025" className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
    </div>
    <Table data={filtered} cols={cols} onRow={onSelect} name="products" />
  </div>)
};

const ProductDetail = ({ product, onBack }) => {
  const [minQty, setMinQty] = useState(0);
  const chart = useMemo(() => { if (!product.monthly_qty) return []; return Object.entries(product.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [product]);
  const allStores = PRODUCT_STORES[String(product.id)] || [];
  const stores = useMemo(() => minQty > 0 ? allStores.filter(s => (s.qty_2025 || 0) >= minQty) : allStores, [allStores, minQty]);
  
  const storeCols = [
    { k: 'name', l: 'חנות', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'status', l: 'סטטוס', r: (v, r) => <StatusBadge status={v} recovery={r.is_recovering} shortTerm={r.metric_short_term} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button>
      <button onClick={() => exportPDF(product.name + ' - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">{product.name}</h1><p className="text-gray-500 mt-1">{product.category}</p></div>
        <Badge status={product.status} />
      </div>
    </div>
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <MBox label="שנתי (24→25)" value={product.metric_12v12} sub={fmt(product.qty_2024) + '→' + fmt(product.qty_2025)} />
      <MBox label="6 חודשים" value={product.metric_6v6} sub={fmt(product.qty_prev6) + '→' + fmt(product.qty_last6)} />
      <MBox label="3 חודשים" value={product.metric_3v3} sub={fmt(product.qty_prev3) + '→' + fmt(product.qty_last3)} />
      <MBox label="2 חודשים" value={product.metric_2v2} sub={fmt(product.qty_prev2) + '→' + fmt(product.qty_last2)} />
      <MBox label="מרחק מהשיא" value={product.metric_peak_distance} extra={'שיא: ' + fmt(product.peak_value) + ' | דצמ: ' + fmt(product.current_value)} />
      <MBox label="חזרות %" value={(product.returns_pct_prev6?.toFixed(1) || 0) + '%→' + (product.returns_pct_last6?.toFixed(1) || 0) + '%'} sub={'שינוי: ' + (product.returns_change > 0 ? '+' : '') + (product.returns_change?.toFixed(1) || 0) + '%'} pos={product.returns_change <= 0} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(product.qty_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(product.qty_2025)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">חזרות % (H2)</p><p className="text-xl font-bold text-gray-600">{(product.returns_pct_last6 || 0).toFixed(1)}%</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור</p><p className="text-xl font-bold text-gray-600">₪{fmt(product.total_sales)}</p></div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#8b5cf6" fill="url(#pg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">חנויות שמוכרות ({stores.length}{minQty > 0 ? ` מתוך ${allStores.length}` : ''})</h3>
        <div className="flex items-center gap-2 print:hidden">
          <label className="text-sm text-gray-600">מינימום פריטים:</label>
          <input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="0" className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>
      {stores.length > 0 ? <Table data={stores} cols={storeCols} name={'product_' + product.id + '_stores'} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}
    </div>
  </div>);
};

const Alerts = ({ stores, onSelect }) => {
  const alerts = useMemo(() => stores.filter(s => !s.is_inactive && (s.status === 'התרסקות' || s.declining_months >= 3)).sort((a,b) => a.metric_12v12 - b.metric_12v12), [stores]);
  return (<div className="space-y-4">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">התראות ({alerts.length})</h2><button onClick={() => exportPDF('התראות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    {alerts.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">אין התראות</p></div> : 
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{alerts.map(s => 
      <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow-lg p-5 border-2 border-red-200 hover:border-red-400 cursor-pointer">
        <div className="flex justify-between items-start mb-4"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div><Badge status={s.status} sm /></div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">שנתי</p><p className="font-bold text-red-600">{fmtPct(s.metric_12v12)}</p></div>
          <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">ירידה רצופה</p><p className="font-bold text-red-600">{s.declining_months || 0} חודשים</p></div>
          <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">מרחק מהשיא</p><p className="font-bold text-red-600">{fmtPct(s.metric_peak_distance)}</p></div>
        </div>
      </div>
    )}</div>}
  </div>);
};

const Rankings = ({ stores, onSelect }) => {
  // Recovery = stores with negative long-term but positive short-term (2 months)
  const r = useMemo(() => ({
    qty: [...stores].sort((a,b) => (b.qty_total||0)-(a.qty_total||0)).slice(0,30),
    growth: [...stores].filter(s=>!s.is_inactive).sort((a,b) => (b.metric_12v12||0)-(a.metric_12v12||0)).slice(0,30),
    recovery: [...stores].filter(s => s.is_recovering || (s.status_long === 'ירידה' || s.status_long === 'קריטי') && s.status_short === 'עלייה חדה').slice(0,30)
  }), [stores]);
  const List = ({ title, data, icon, bg, showGrowth, showRecovery }) => (
    <div className="bg-white rounded-2xl shadow-lg p-5 border">
      <h3 className="text-lg font-bold mb-4">{icon} {title} {data.length > 0 && <span className="text-sm font-normal text-gray-500">({data.length})</span>}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-8">אין נתונים</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.map((s,i) => (
            <div key={s.id} onClick={() => onSelect(s)} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className={'w-6 h-6 flex items-center justify-center text-white rounded-full text-xs font-bold ' + bg}>{i+1}</span>
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              {showRecovery ? (
                <div className="text-left">
                  <p className="text-xs text-gray-500">ארוך: <span className="text-red-600 font-bold">{fmtPct(s.metric_long_term || s.metric_12v12)}</span></p>
                  <p className="text-xs text-gray-500">קצר: <span className="text-emerald-600 font-bold">{fmtPct(s.metric_2v2 || s.metric_short_term)}</span></p>
                </div>
              ) : (
                <span className={'text-sm font-bold ' + (showGrowth ? (s.metric_12v12 >= 0 ? 'text-emerald-600' : 'text-red-600') : '')}>{showGrowth ? fmtPct(s.metric_12v12) : fmt(s.qty_total)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">דירוגים</h2>
        <button onClick={() => exportPDF('דירוגים - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <List title="לפי כמות כוללת" data={r.qty} icon="🏆" bg="bg-blue-500" />
        <List title="לפי צמיחה" data={r.growth} icon="📈" bg="bg-emerald-500" showGrowth />
        <List title="התאוששות" data={r.recovery} icon="💪" bg="bg-amber-500" showRecovery />
      </div>
    </div>
  );
};

const Inactive = ({ stores, onSelect }) => {
  const list = useMemo(() => stores.filter(s => s.is_inactive).sort((a,b) => (b.last_active_month||0)-(a.last_active_month||0)), [stores]);
  return (<div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">לא פעילות ({list.length})</h2><button onClick={() => exportPDF('לא פעילות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>{list.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">כל החנויות פעילות!</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map(s => <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow p-5 border hover:border-gray-400 cursor-pointer"><div className="flex justify-between items-start mb-3"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div><XCircle className="text-red-400" size={20}/></div><div className="space-y-1 text-sm"><p className="text-gray-500">כמות כוללת: <span className="font-semibold">{fmt(s.qty_total)}</span></p><p className="text-gray-500">מחזור: <span className="font-semibold">₪{fmt(s.total_sales)}</span></p><p className="text-red-600 font-medium mt-2">פעילות אחרונה: {fmtMonthHeb(s.last_active_month)}</p></div></div>)}</div>}</div>);
};

const Trends = ({ stores, products }) => {
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k,v]) => { m[k] = (m[k]||0) + v; }); }); return Object.entries(m).sort(([a],[b]) => Number(a)-Number(b)).map(([k,v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  const cats = useMemo(() => { const c = {}; products.forEach(p => { if (p.category) c[p.category] = (c[p.category]||0) + (p.qty_total||0); }); return Object.entries(c).sort(([,a],[,b]) => b-a).slice(0,10).map(([n,v]) => ({ name: n, value: v })); }, [products]);
  const byDriver = useMemo(() => { const d = {}; stores.forEach(s => { if (s.driver) { if (!d[s.driver]) d[s.driver] = { name: s.driver, qty_2024: 0, qty_2025: 0, count: 0 }; d[s.driver].qty_2024 += s.qty_2024 || 0; d[s.driver].qty_2025 += s.qty_2025 || 0; d[s.driver].count++; } }); return Object.values(d).sort((a,b) => b.qty_2025 - a.qty_2025).slice(0,15); }, [stores]);
  const byCity = useMemo(() => { const d = {}; stores.forEach(s => { if (s.city) { if (!d[s.city]) d[s.city] = { name: s.city, qty_2024: 0, qty_2025: 0, count: 0 }; d[s.city].qty_2024 += s.qty_2024 || 0; d[s.city].qty_2025 += s.qty_2025 || 0; d[s.city].count++; } }); return Object.values(d).sort((a,b) => b.qty_2025 - a.qty_2025).slice(0,15); }, [stores]);
  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">מגמות וניתוחים</h2><button onClick={() => exportPDF('מגמות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות כוללת</h3><ResponsiveContainer width="100%" height={300}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tickFormatter={v => (v/1000).toFixed(0)+'K'} tick={{fontSize:10}}/><Tooltip formatter={v => fmt(v)}/><Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">כמויות לפי קטגוריה</h3><ResponsiveContainer width="100%" height={350}><BarChart data={cats} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tickFormatter={v => (v/1000).toFixed(0)+'K'}/><YAxis type="category" dataKey="name" width={120} tick={{fontSize:11}}/><Tooltip formatter={v => fmt(v)}/><Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">ביצועים לפי נהג</h3><div className="space-y-2 max-h-96 overflow-y-auto">{byDriver.map((d, i) => { const change = d.qty_2024 > 0 ? ((d.qty_2025 - d.qty_2024) / d.qty_2024) * 100 : 0; return <div key={d.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-gray-500">{d.count} חנויות</p></div></div><div className="text-left"><p className={'font-bold text-sm ' + (change >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(change)}</p><p className="text-xs text-gray-400">{fmt(d.qty_2024)}→{fmt(d.qty_2025)}</p></div></div>; })}</div></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">ביצועים לפי עיר</h3><div className="space-y-2 max-h-96 overflow-y-auto">{byCity.map((d, i) => { const change = d.qty_2024 > 0 ? ((d.qty_2025 - d.qty_2024) / d.qty_2024) * 100 : 0; return <div key={d.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center bg-teal-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-gray-500">{d.count} חנויות</p></div></div><div className="text-left"><p className={'font-bold text-sm ' + (change >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(change)}</p><p className="text-xs text-gray-400">{fmt(d.qty_2024)}→{fmt(d.qty_2025)}</p></div></div>; })}</div></div>
    </div>
  </div>);
};

const DEFAULT_CONFIG = { 
  // Long term thresholds
  long_growth: 10,      // >= this = צמיחה
  long_stable_min: -10, // >= this = יציב
  long_stable_max: 10,  // <= this = יציב
  long_decline: -30,    // >= this = ירידה, below = קריטי
  // Short term thresholds (2 months)
  short_surge: 15,      // >= this = עלייה חדה
  short_stable_min: -10, // >= this = יציב
  short_decline: -25,   // >= this = ירידה, below = אזעקה
};
const getConfig = () => { if (typeof window === 'undefined') return DEFAULT_CONFIG; try { const saved = localStorage.getItem('baron_config'); return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; } };
const saveConfig = (config) => { if (typeof window !== 'undefined') localStorage.setItem('baron_config', JSON.stringify(config)); };

const SettingsPage = ({ onLogout }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', ok: false });
  
  React.useEffect(() => { setConfig(getConfig()); }, []);
  const handleSave = () => { saveConfig(config); setSaved(true); setTimeout(() => { setSaved(false); window.location.reload(); }, 1000); };
  const handleReset = () => { setConfig(DEFAULT_CONFIG); saveConfig(DEFAULT_CONFIG); window.location.reload(); };
  
  const handlePasswordChange = () => {
    if (oldPwd !== getPassword()) {
      setPwdMsg({ text: 'סיסמא נוכחית שגויה', ok: false });
      return;
    }
    if (newPwd.length < 4) {
      setPwdMsg({ text: 'סיסמא חדשה קצרה מדי (מינימום 4 תווים)', ok: false });
      return;
    }
    setPassword(newPwd);
    setPwdMsg({ text: 'סיסמא שונתה בהצלחה!', ok: true });
    setOldPwd('');
    setNewPwd('');
    setTimeout(() => setPwdMsg({ text: '', ok: false }), 3000);
  };
  
  return (<div className="space-y-6">
    <h2 className="text-xl font-bold">הגדרות</h2>
    
    {/* Password Change */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🔐 שינוי סיסמא</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-600 block mb-1">סיסמא נוכחית</label>
          <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="הזן סיסמא נוכחית" className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">סיסמא חדשה</label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="הזן סיסמא חדשה" className="w-full px-3 py-2 border rounded-lg" />
        </div>
      </div>
      {pwdMsg.text && <p className={`text-sm mt-2 ${pwdMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{pwdMsg.text}</p>}
      <button onClick={handlePasswordChange} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">שנה סיסמא</button>
    </div>
    
    {/* Status Config - NEW CLEAR VERSION */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Settings size={20}/>הגדרות סטטוסים</h3>
      <p className="text-sm text-gray-500 mb-6">הגדר את הספים לחישוב סטטוס טווח ארוך וטווח קצר</p>
      
      {/* LONG TERM */}
      <div className="mb-6">
        <h4 className="font-bold text-gray-700 mb-3 pb-2 border-b">📊 טווח ארוך (מבוסס על שנתי 24→25)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-emerald-700 font-bold">🟢 צמיחה</span></div>
            <p className="text-xs text-gray-600 mb-2">≥ X%</p>
            <input type="number" value={config.long_growth} onChange={e => setConfig({...config, long_growth: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm"/>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-blue-700 font-bold">🔵 יציב</span></div>
            <p className="text-xs text-gray-600 mb-2">בין X% ל-Y%</p>
            <div className="flex gap-1">
              <input type="number" value={config.long_stable_min} onChange={e => setConfig({...config, long_stable_min: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" placeholder="מ-"/>
              <input type="number" value={config.long_stable_max} onChange={e => setConfig({...config, long_stable_max: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" placeholder="עד"/>
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-orange-700 font-bold">🟠 ירידה</span></div>
            <p className="text-xs text-gray-600 mb-2">בין X% לסף יציב</p>
            <input type="number" value={config.long_decline} onChange={e => setConfig({...config, long_decline: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm" placeholder="סף תחתון"/>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-red-700 font-bold">🔴 קריטי</span></div>
            <p className="text-xs text-gray-600 mb-2">&lt; סף ירידה</p>
            <p className="text-xs text-gray-500">(אוטומטי)</p>
          </div>
        </div>
      </div>
      
      {/* SHORT TERM */}
      <div>
        <h4 className="font-bold text-gray-700 mb-3 pb-2 border-b">⚡ טווח קצר - אזעקות (מבוסס על 2 חודשים אחרונים)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-emerald-700 font-bold">🚀 עלייה חדה</span></div>
            <p className="text-xs text-gray-600 mb-2">≥ X%</p>
            <input type="number" value={config.short_surge} onChange={e => setConfig({...config, short_surge: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm"/>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-gray-700 font-bold">✅ יציב</span></div>
            <p className="text-xs text-gray-600 mb-2">≥ X%</p>
            <input type="number" value={config.short_stable_min} onChange={e => setConfig({...config, short_stable_min: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm"/>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-orange-700 font-bold">⚠️ ירידה</span></div>
            <p className="text-xs text-gray-600 mb-2">≥ X%</p>
            <input type="number" value={config.short_decline} onChange={e => setConfig({...config, short_decline: Number(e.target.value)})} className="w-full px-2 py-1 border rounded text-sm"/>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-1 mb-2"><span className="text-red-700 font-bold">🚨 אזעקה</span></div>
            <p className="text-xs text-gray-600 mb-2">&lt; סף ירידה</p>
            <p className="text-xs text-gray-500">(אוטומטי)</p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className={'px-6 py-2 rounded-xl font-medium transition-all ' + (saved ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600')}>{saved ? <span className="flex items-center gap-2"><Check size={16}/>נשמר!</span> : 'שמור הגדרות'}</button>
        <button onClick={handleReset} className="px-6 py-2 rounded-xl font-medium bg-gray-200 hover:bg-gray-300">איפוס</button>
      </div>
    </div>
    
    {/* System Info */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">ℹ️ מידע על המערכת</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{STORES_RAW.length}</p><p className="text-xs text-gray-500">חנויות</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-purple-600">{PRODUCTS_RAW.length}</p><p className="text-xs text-gray-500">מוצרים</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{STORES_RAW.filter(s => !s.is_inactive).length}</p><p className="text-xs text-gray-500">חנויות פעילות</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-gray-600">v7.4</p><p className="text-xs text-gray-500">גרסה</p></div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-4">עדכון אחרון: ינואר 2026</p>
    </div>
    
    {/* Logout */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <button onClick={onLogout} className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 flex items-center justify-center gap-2">
        <LogOut size={20} />
        התנתק מהמערכת
      </button>
    </div>
  </div>);
};

// Baron Logo Component - using actual image
const BaronLogo = () => (
  <div className="flex items-center gap-3">
    <img src="/baron-logo.png" alt="ברון" className="h-10 w-auto" />
  </div>
);

// Exclusion Search Component
const ExclusionSearch = ({ type, items, excluded, onToggle }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20);
  const isExcluded = (id) => excluded.includes(id);
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder={type === 'stores' ? 'חפש חנות...' : 'חפש מוצר...'} 
          className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
        />
      </div>
      {search && (
        <div className="max-h-48 overflow-y-auto border rounded-lg">
          {filtered.map(item => (
            <div 
              key={item.id} 
              onClick={() => onToggle(item.id)}
              className={'flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer ' + (isExcluded(item.id) ? 'bg-red-50' : '')}
            >
              <span className="text-sm">{item.name}</span>
              {isExcluded(item.id) ? 
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">מוחרג</span> : 
                <span className="text-xs text-gray-400">לחץ להחרגה</span>
              }
            </div>
          ))}
        </div>
      )}
      {excluded.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">מוחרגים ({excluded.length}):</p>
          <div className="flex flex-wrap gap-1">
            {excluded.map(id => {
              const item = items.find(i => i.id === id);
              return item ? (
                <span key={id} onClick={() => onToggle(id)} className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-red-200">
                  {item.name.slice(0, 15)}{item.name.length > 15 ? '...' : ''}
                  <X size={12} />
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [loggedIn, setLoggedInState] = useState(false);
  const [tab, setTab] = useState('overview');
  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [menu, setMenu] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [excludedStores, setExcludedStores] = useState([]);
  const [excludedProducts, setExcludedProducts] = useState([]);
  const [showExclusions, setShowExclusions] = useState(false);
  
  useEffect(() => { 
    setConfig(getConfig()); 
    setLoggedInState(isLoggedIn());
  }, []);
  
  const handleLogin = () => setLoggedInState(true);
  const handleLogout = () => { setLoggedIn(false); setLoggedInState(false); };
  
  const toggleExcludeStore = (id) => {
    setExcludedStores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleExcludeProduct = (id) => {
    setExcludedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const clearExclusions = () => { setExcludedStores([]); setExcludedProducts([]); };
  
  // Apply config and filter exclusions
  const STORES = useMemo(() => {
    const configured = applyConfig(STORES_RAW, config);
    return configured.filter(s => !excludedStores.includes(s.id));
  }, [config, excludedStores]);
  
  const PRODUCTS = useMemo(() => {
    const configured = applyConfig(PRODUCTS_RAW, config);
    return configured.filter(p => !excludedProducts.includes(p.id));
  }, [config, excludedProducts]);
  
  const tabs = [
    { id: 'overview', l: 'סקירה', I: Home },
    { id: 'stores', l: 'חנויות', I: Store },
    { id: 'products', l: 'מוצרים', I: Package },
    { id: 'trends', l: 'מגמות', I: TrendingUp },
    { id: 'alerts', l: 'התראות', I: Bell },
    { id: 'rankings', l: 'דירוגים', I: Award },
    { id: 'inactive', l: 'לא פעילות', I: XCircle },
    { id: 'settings', l: 'הגדרות', I: Settings }
  ];
  
  const nav = (t, i) => { if (t === 'store') { setStore(i); setTab('stores'); } else { setProduct(i); setTab('products'); } };
  
  const content = () => {
    if (store) return <StoreDetail store={store} onBack={() => setStore(null)} allStores={STORES} />;
    if (product) return <ProductDetail product={product} onBack={() => setProduct(null)} />;
    switch (tab) {
      case 'overview': return <Overview stores={STORES} products={PRODUCTS} onNav={nav} />;
      case 'stores': return <StoresList stores={STORES} onSelect={setStore} />;
      case 'products': return <ProductsList products={PRODUCTS} onSelect={setProduct} />;
      case 'trends': return <Trends stores={STORES} products={PRODUCTS} />;
      case 'alerts': return <Alerts stores={STORES} onSelect={setStore} />;
      case 'rankings': return <Rankings stores={STORES} onSelect={setStore} />;
      case 'inactive': return <Inactive stores={STORES} onSelect={setStore} />;
      case 'settings': return <SettingsPage onLogout={handleLogout} />;
      default: return <Overview stores={STORES} products={PRODUCTS} onNav={nav} />;
    }
  };
  
  // Show login screen if not logged in
  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  const totalExclusions = excludedStores.length + excludedProducts.length;
  
  return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
    <header className="bg-white shadow-sm border-b sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setMenu(!menu)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">{menu ? <X size={24}/> : <Menu size={24}/>}</button>
          <BaronLogo />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExclusions(!showExclusions)} className={'relative p-2 rounded-xl transition-colors ' + (showExclusions ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-600')}>
            <Filter size={20} />
            {totalExclusions > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{totalExclusions}</span>}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600"><User size={18}/><span>מנהל</span></div>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><LogOut size={20}/></button>
        </div>
      </div>
    </header>
    
    {/* Exclusions Panel */}
    {showExclusions && (
      <div className="bg-white border-b shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">🚫 החרגות זמניות</h3>
            {totalExclusions > 0 && (
              <button onClick={clearExclusions} className="text-sm text-red-600 hover:text-red-800">נקה הכל ({totalExclusions})</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">🏪 חנויות</p>
              <ExclusionSearch type="stores" items={applyConfig(STORES_RAW, config)} excluded={excludedStores} onToggle={toggleExcludeStore} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">📦 מוצרים</p>
              <ExclusionSearch type="products" items={applyConfig(PRODUCTS_RAW, config)} excluded={excludedProducts} onToggle={toggleExcludeProduct} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">* ההחרגות הן זמניות ומתאפסות בטעינה מחדש של הדף</p>
        </div>
      </div>
    )}
    
    <div className="flex">
      <aside className="hidden lg:block w-56 bg-white border-l fixed top-[60px] bottom-0 overflow-y-auto print:hidden">
        <nav className="p-4 space-y-1">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setStore(null); setProduct(null); }} className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ' + (tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}><t.I size={20}/>{t.l}</button>)}</nav>
      </aside>
      {menu && <div className="lg:hidden fixed inset-0 z-40 bg-black/50 print:hidden" onClick={() => setMenu(false)}><div className="w-64 bg-white h-full" onClick={e => e.stopPropagation()}><nav className="p-4 space-y-1 mt-16">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setStore(null); setProduct(null); setMenu(false); }} className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl ' + (tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}><t.I size={20}/>{t.l}</button>)}</nav></div></div>}
      <main className="flex-1 p-4 lg:p-6 lg:mr-56 w-full">{content()}</main>
    </div>
  </div>);
}
